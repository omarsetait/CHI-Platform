import {
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Brain,
  Eye,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type InsightIcon =
  | "lightbulb"
  | "alert-triangle"
  | "check-circle"
  | "brain"
  | "eye"
  | "activity";

interface InsightCardProps {
  icon: InsightIcon;
  headline: string;
  body: string;
  tag: string;
}

const iconMap = {
  lightbulb: Lightbulb,
  "alert-triangle": AlertTriangle,
  "check-circle": CheckCircle,
  brain: Brain,
  eye: Eye,
  activity: Activity,
};

const iconColors: Record<InsightIcon, string> = {
  lightbulb: "text-amber-500",
  "alert-triangle": "text-orange-500",
  "check-circle": "text-emerald-500",
  brain: "text-violet-500",
  eye: "text-blue-500",
  activity: "text-rose-500",
};

export function InsightCard({ icon, headline, body, tag }: InsightCardProps) {
  const IconComponent = iconMap[icon];

  return (
    <div className="flex gap-3 p-4 rounded-lg border bg-card shadow-sm">
      <div className="shrink-0 mt-0.5">
        <IconComponent className={cn("h-5 w-5", iconColors[icon])} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold">{headline}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {tag}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
