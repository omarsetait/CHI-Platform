import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Upload,
  Brain,
  Scale,
  TrendingUp,
  Users,
  Activity,
  Clock,
  CheckCircle,
  FileText,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";

interface Phase {
  phase: number;
  name: string;
  description: string;
  icon: typeof Upload;
  claimsCount: number;
  avgTime: string;
  status: "active" | "idle";
  completedToday: number;
}

const phases: Phase[] = [
  { 
    phase: 1, 
    name: "Ingest", 
    description: "Initial claim submission, data extraction, and validation. Claims are received from various sources and preprocessed for analysis.",
    icon: Upload, 
    claimsCount: 8,
    avgTime: "< 1 min",
    status: "active",
    completedToday: 234
  },
  { 
    phase: 2, 
    name: "Analysis", 
    description: "Multi-agent AI signal generation across regulatory, clinical, coverage, and historical dimensions. Each agent independently evaluates the claim.",
    icon: Brain, 
    claimsCount: 5,
    avgTime: "2-3 min",
    status: "active",
    completedToday: 198
  },
  { 
    phase: 3, 
    name: "Aggregation", 
    description: "Signal combination and comprehensive risk scoring. Individual agent signals are weighted and merged to form a unified assessment.",
    icon: Scale, 
    claimsCount: 3,
    avgTime: "< 1 min",
    status: "active",
    completedToday: 195
  },
  { 
    phase: 4, 
    name: "Recommendation", 
    description: "Final AI recommendation with confidence scores. The system produces approval, rejection, or review recommendations based on aggregated signals.",
    icon: TrendingUp, 
    claimsCount: 7,
    avgTime: "< 1 min",
    status: "active",
    completedToday: 188
  },
  { 
    phase: 5, 
    name: "Adjudicator", 
    description: "Human review and final decision by trained adjudicators. Claims flagged for review are evaluated with AI recommendations as guidance.",
    icon: Users, 
    claimsCount: 12,
    avgTime: "5-10 min",
    status: "active",
    completedToday: 156
  },
  { 
    phase: 6, 
    name: "RLHF", 
    description: "Reinforcement Learning from Human Feedback collection. Adjudicator decisions are captured to improve AI model performance over time.",
    icon: Activity, 
    claimsCount: 12,
    avgTime: "< 1 min",
    status: "active",
    completedToday: 156
  },
];

function PhaseCard({ phase }: { phase: Phase }) {
  const IconComponent = phase.icon;
  const progressPercentage = Math.min((phase.completedToday / 250) * 100, 100);

  return (
    <Card className="hover-elevate" data-testid={`phase-card-${phase.phase}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <IconComponent className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Phase {phase.phase}</Badge>
                <Badge 
                  variant={phase.status === "active" ? "default" : "secondary"} 
                  className="text-xs"
                >
                  {phase.status}
                </Badge>
              </div>
              <CardTitle className="text-lg mt-1">{phase.name}</CardTitle>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription>{phase.description}</CardDescription>
        
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div>
            <p className="text-xs text-muted-foreground">In Queue</p>
            <p className="text-xl font-bold">{phase.claimsCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg Time</p>
            <p className="text-sm font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {phase.avgTime}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="text-sm font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              {phase.completedToday}
            </p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Daily Progress</span>
            <span className="font-medium">{progressPercentage.toFixed(0)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorkflowPhases() {
  const totalInPipeline = phases.reduce((sum, p) => sum + p.claimsCount, 0);
  const totalProcessedToday = phases[0].completedToday;

  return (
    <div className="p-6 space-y-6" data-testid="page-workflow-phases">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Workflow Phases</h1>
          <p className="text-muted-foreground">
            Claims adjudication workflow with 6-phase processing pipeline
          </p>
        </div>
        <Button asChild data-testid="button-view-claims">
          <Link href="/claims-governance/adjudication/claims">
            View Claims Queue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total in Pipeline</p>
                <p className="text-2xl font-bold">{totalInPipeline}</p>
              </div>
              <div className="p-2 rounded-full bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Processed Today</p>
                <p className="text-2xl font-bold">{totalProcessedToday}</p>
              </div>
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Avg. End-to-End</p>
                <p className="text-2xl font-bold">12 min</p>
              </div>
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Auto-Approval Rate</p>
                <p className="text-2xl font-bold">67%</p>
              </div>
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Overview</CardTitle>
          <CardDescription>
            Visual representation of the claim flow through all phases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4">
            {phases.map((phase, idx) => {
              const IconComponent = phase.icon;
              return (
                <div key={phase.phase} className="flex items-center">
                  <div className="flex flex-col items-center min-w-[100px]">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <IconComponent className="w-7 h-7 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-center">{phase.name}</span>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {phase.claimsCount}
                    </Badge>
                  </div>
                  {idx < phases.length - 1 && (
                    <ArrowRight className="w-5 h-5 text-muted-foreground mx-2 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {phases.map(phase => (
          <PhaseCard key={phase.phase} phase={phase} />
        ))}
      </div>
    </div>
  );
}
