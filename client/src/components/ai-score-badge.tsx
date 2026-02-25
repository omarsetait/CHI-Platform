import { Badge } from "@/components/ui/badge";

interface AIScoreBadgeProps {
  score: number;
  className?: string;
}

export function AIScoreBadge({ score, className = "" }: AIScoreBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 0.7) return "bg-chart-2 text-white";
    if (score >= 0.4) return "bg-chart-3 text-foreground";
    return "bg-chart-4 text-white";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.7) return "High Risk";
    if (score >= 0.4) return "Medium Risk";
    return "Low Risk";
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold" data-testid={`text-ai-score-${score.toFixed(2)}`}>
        {score.toFixed(2)}
      </span>
      <Badge className={`${getScoreColor(score)} ${className} text-xs font-medium px-2 py-0.5`}>
        {getScoreLabel(score)}
      </Badge>
    </div>
  );
}
