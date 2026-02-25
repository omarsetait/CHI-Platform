import { Card, CardContent } from "@/components/ui/card";

interface RiskScoreDisplayProps {
  score: number;
  size?: "sm" | "lg";
}

export function RiskScoreDisplay({ score, size = "lg" }: RiskScoreDisplayProps) {
  const getScoreColor = (score: number) => {
    if (score >= 0.7) return "text-chart-2";
    if (score >= 0.3) return "text-chart-3";
    return "text-chart-4";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.7) return "High Risk";
    if (score >= 0.3) return "Medium Risk";
    return "Low Risk";
  };

  const sizeClasses = size === "lg" ? "text-5xl" : "text-2xl";

  return (
    <Card className="bg-primary/10" data-testid="card-risk-score">
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground mb-2">Overall Score</p>
        <div className={`${sizeClasses} font-bold ${getScoreColor(score)}`}>
          {score.toFixed(2)}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{getScoreLabel(score)}</p>
      </CardContent>
    </Card>
  );
}
