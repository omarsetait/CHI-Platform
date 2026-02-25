import { Badge } from "@/components/ui/badge";

export type RiskType = 
  | "Claim Cost" 
  | "Length of Stay" 
  | "Surgery Fee" 
  | "Potential Non-disclosure"
  | "High Benefit Cost"
  | "Frequent Readmission (Different ICD)"
  | "Frequent Readmission (Same ICD)";

interface RiskBadgeProps {
  type: RiskType;
  className?: string;
}

const riskColors: Record<RiskType, string> = {
  "Claim Cost": "bg-chart-2 text-white",
  "Length of Stay": "bg-chart-4 text-white",
  "Surgery Fee": "bg-chart-3 text-foreground",
  "Potential Non-disclosure": "bg-chart-5 text-white",
  "High Benefit Cost": "bg-chart-2 text-white",
  "Frequent Readmission (Different ICD)": "bg-chart-3 text-foreground",
  "Frequent Readmission (Same ICD)": "bg-chart-3 text-foreground",
};

export function RiskBadge({ type, className = "" }: RiskBadgeProps) {
  return (
    <Badge 
      className={`${riskColors[type]} ${className} text-xs font-medium px-2 py-0.5`}
      data-testid={`badge-${type.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {type}
    </Badge>
  );
}
