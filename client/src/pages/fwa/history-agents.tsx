import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { InlineLoader } from "@/components/ui/loading";
import {
  Users,
  Building,
  FlaskConical,
  HeartPulse,
  Users2,
  FileText,
  FileCheck,
  Pill,
  TrendingUp,
  Award,
  BarChart3,
  Network,
  CheckCircle,
  Clock,
  Bot,
  type LucideIcon,
} from "lucide-react";

// ---- Types for the API response ----
interface AgentMetricRow {
  id: string;
  agentId: string;
  agentName: string;
  module: string;
  totalRecommendations: number | null;
  acceptedRecommendations: number | null;
  overriddenRecommendations: number | null;
  escalatedRecommendations: number | null;
  acceptanceRate: string | null;
  confidenceAccuracy: string | null;
  avgRewardScore: string | null;
  lastUpdated: string | null;
}

// ---- Mapped UI shape ----
interface AgentDisplay {
  name: string;
  icon: LucideIcon;
  description: string;
  status: "active" | "idle";
  processed: number;
  accuracy: number;
}

// ---- Static metadata lookup (icons + descriptions not stored in DB) ----
const agentMeta: Record<string, { icon: LucideIcon; description: string }> = {
  "Lab Results Agent": {
    icon: FlaskConical,
    description:
      "Validates current claims against historical lab values. Checks result consistency, timeline logic, duplicate testing.",
  },
  "Pre-existing Conditions Agent": {
    icon: HeartPulse,
    description:
      "Validates declared vs. undeclared conditions. Checks condition conflicts, progression logic.",
  },
  "Family History Agent": {
    icon: Users2,
    description:
      "Validates genetic risk declarations. Checks undisclosed hereditary conditions.",
  },
  "Claims History Agent": {
    icon: FileText,
    description:
      "Validates service patterns, utilization trends. Checks duplicate services, frequency anomalies.",
  },
  "Declarations Agent": {
    icon: FileCheck,
    description:
      "Validates consistency with medical documentation. Checks statement conflicts, omission detection.",
  },
  "Medication History Agent": {
    icon: Pill,
    description:
      "Validates medication interactions, compliance. Checks conflicting prescriptions, diagnosis alignment.",
  },
  "Claims Pattern Agent": {
    icon: TrendingUp,
    description:
      "Validates historical billing patterns. Checks anomalous billing, code frequency shifts.",
  },
  "Credentials Agent": {
    icon: Award,
    description:
      "Validates scope of practice. Checks unauthorized procedures, specialty mismatches.",
  },
  "Quality Metrics Agent": {
    icon: BarChart3,
    description:
      "Validates historical quality scores. Checks pattern deviations, quality degradation.",
  },
  "Network Agent": {
    icon: Network,
    description:
      "Validates referral patterns, affiliations. Checks collusion indicators, suspicious networks.",
  },
};

const defaultMeta = {
  icon: Bot,
  description: "Specialized history analysis agent.",
};

// ---- Map a DB row to UI display shape ----
function toAgentDisplay(row: AgentMetricRow): AgentDisplay {
  const meta = agentMeta[row.agentName] ?? defaultMeta;
  const accuracy = row.acceptanceRate
    ? Math.round(parseFloat(row.acceptanceRate))
    : row.confidenceAccuracy
      ? Math.round(parseFloat(row.confidenceAccuracy))
      : 0;
  const processed = row.totalRecommendations ?? 0;

  // Consider the agent "active" if it has processed any recommendations
  const status: "active" | "idle" = processed > 0 ? "active" : "idle";

  return {
    name: row.agentName,
    icon: meta.icon,
    description: meta.description,
    status,
    processed,
    accuracy,
  };
}

function AgentCard({ agent }: { agent: AgentDisplay }) {
  return (
    <Card className="hover-elevate" data-testid={`agent-card-${agent.name.toLowerCase().replace(/\s/g, "-")}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 shrink-0">
              <agent.icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium">{agent.name}</h3>
                {agent.status === "active" ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">{agent.description}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Accuracy</span>
            <span className="text-sm font-medium">{agent.accuracy}%</span>
          </div>
          <Progress value={agent.accuracy} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {agent.processed.toLocaleString()} records processed
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HistoryAgents() {
  const { data: allMetrics = [], isLoading } = useQuery<AgentMetricRow[]>({
    queryKey: ["/api/fwa/agent-metrics"],
  });

  // Split by module field: "patient" vs "provider"
  const patientHistoryAgents = allMetrics
    .filter((r) => r.module === "patient")
    .map(toAgentDisplay);

  const providerHistoryAgents = allMetrics
    .filter((r) => r.module === "provider")
    .map(toAgentDisplay);

  const totalPatientProcessed = patientHistoryAgents.reduce((sum, a) => sum + a.processed, 0);
  const totalProviderProcessed = providerHistoryAgents.reduce((sum, a) => sum + a.processed, 0);
  const avgPatientAccuracy =
    patientHistoryAgents.length > 0
      ? Math.round(patientHistoryAgents.reduce((sum, a) => sum + a.accuracy, 0) / patientHistoryAgents.length)
      : 0;
  const avgProviderAccuracy =
    providerHistoryAgents.length > 0
      ? Math.round(providerHistoryAgents.reduce((sum, a) => sum + a.accuracy, 0) / providerHistoryAgents.length)
      : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]" data-testid="loading-history-agents">
        <InlineLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">B3</Badge>
        </div>
        <h1 className="text-2xl font-bold" data-testid="page-title">History Agents</h1>
        <p className="text-muted-foreground">
          Specialized agents for multi-dimensional historical data retrieval and discrepancy detection
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Architecture: Specialized Agents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">
              Critical Requirement: Specialized Agents Per History Type
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Each agent has domain expertise in its specific history type - NO generalized history checking.
              Each specialized agent queries its specific database independently for precise discrepancy detection.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-600">{patientHistoryAgents.length}</p>
              <p className="text-sm text-muted-foreground">Patient Agents</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-600">{providerHistoryAgents.length}</p>
              <p className="text-sm text-muted-foreground">Provider Agents</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-600">{(totalPatientProcessed + totalProviderProcessed).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Processed</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-600">
                {patientHistoryAgents.length > 0 || providerHistoryAgents.length > 0
                  ? Math.round((avgPatientAccuracy + avgProviderAccuracy) / (avgPatientAccuracy > 0 && avgProviderAccuracy > 0 ? 2 : 1))
                  : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Avg Accuracy</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Patient History Agents</h2>
            <p className="text-sm text-muted-foreground">{totalPatientProcessed.toLocaleString()} records • {avgPatientAccuracy}% avg accuracy</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patientHistoryAgents.map((agent) => (
            <AgentCard key={agent.name} agent={agent} />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
            <Building className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Provider History Agents</h2>
            <p className="text-sm text-muted-foreground">{totalProviderProcessed.toLocaleString()} records • {avgProviderAccuracy}% avg accuracy</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providerHistoryAgents.map((agent) => (
            <AgentCard key={agent.name} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  );
}
