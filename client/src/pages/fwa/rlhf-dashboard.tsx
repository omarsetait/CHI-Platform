import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Brain,
  CheckCircle,
  XCircle,
  TrendingUp,
  RefreshCw,
  Activity,
  Users,
  Target,
} from "lucide-react";

interface RLHFMetrics {
  fwa: {
    totalActions: number;
    acceptedRecommendations: number;
    overriddenRecommendations: number;
    acceptanceRate: number;
  };
  claims: {
    totalActions: number;
    acceptedRecommendations: number;
    overriddenRecommendations: number;
    acceptanceRate: number;
  };
  agentMetrics: Record<string, { total: number; accepted: number; rate: number }>;
  lastUpdated: string;
}

interface FeedbackEvent {
  id: string;
  caseId?: string;
  claimId?: string;
  entityId: string;
  entityType: string;
  phase: string;
  aiRecommendation: any;
  humanAction: string;
  wasAccepted: boolean;
  overrideReason?: string;
  reviewerNotes?: string;
  createdAt: string;
}

const CHART_COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#3b82f6"];

export default function RLHFDashboardPage() {
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery<RLHFMetrics>({
    queryKey: ["/api/rlhf/metrics"],
    refetchInterval: 30000,
  });

  const { data: fwaFeedback, isLoading: fwaLoading, refetch: refetchFwa } = useQuery<FeedbackEvent[]>({
    queryKey: ["/api/rlhf/feedback/fwa"],
  });

  const { data: claimsFeedback, isLoading: claimsLoading, refetch: refetchClaims } = useQuery<FeedbackEvent[]>({
    queryKey: ["/api/rlhf/feedback/claims"],
  });

  const handleRefresh = () => {
    refetchMetrics();
    refetchFwa();
    refetchClaims();
  };

  const acceptanceChartData = metrics ? [
    { name: "FWA", accepted: metrics.fwa.acceptedRecommendations, overridden: metrics.fwa.overriddenRecommendations },
    { name: "Claims", accepted: metrics.claims.acceptedRecommendations, overridden: metrics.claims.overriddenRecommendations },
  ] : [];

  const pieData = metrics ? [
    { name: "Accepted", value: metrics.fwa.acceptedRecommendations + metrics.claims.acceptedRecommendations },
    { name: "Overridden", value: metrics.fwa.overriddenRecommendations + metrics.claims.overriddenRecommendations },
  ] : [];

  const totalActions = (metrics?.fwa.totalActions || 0) + (metrics?.claims.totalActions || 0);
  const overallAcceptanceRate = totalActions > 0
    ? Math.round(((metrics?.fwa.acceptedRecommendations || 0) + (metrics?.claims.acceptedRecommendations || 0)) / totalActions * 100)
    : 0;

  return (
    <div className="p-6 space-y-6" data-testid="page-rlhf-dashboard">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            RLHF Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Reinforcement Learning from Human Feedback - AI Model Performance
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} data-testid="button-refresh">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="stat-total-actions">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalActions}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Human decisions recorded</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-acceptance-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{overallAcceptanceRate}%</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">AI recommendations accepted</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-accepted">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {(metrics?.fwa.acceptedRecommendations || 0) + (metrics?.claims.acceptedRecommendations || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Followed AI recommendation</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-overridden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overridden</CardTitle>
            <XCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-amber-600">
                {(metrics?.fwa.overriddenRecommendations || 0) + (metrics?.claims.overriddenRecommendations || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Human chose different action</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acceptance vs Override by Module</CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : acceptanceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={acceptanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="accepted" name="Accepted" fill="#22c55e" />
                  <Bar dataKey="overridden" name="Overridden" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No feedback data available yet. Take actions on cases or claims to see analytics.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Overall Decision Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : pieData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No feedback data available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Agent Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metricsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : metrics?.agentMetrics && Object.keys(metrics.agentMetrics).length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent ID</TableHead>
                  <TableHead className="text-right">Total Decisions</TableHead>
                  <TableHead className="text-right">Accepted</TableHead>
                  <TableHead className="text-right">Acceptance Rate</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(metrics.agentMetrics).map(([agentId, agentData]) => (
                  <TableRow key={agentId} data-testid={`agent-row-${agentId}`}>
                    <TableCell className="font-mono text-sm">{agentId}</TableCell>
                    <TableCell className="text-right">{agentData.total}</TableCell>
                    <TableCell className="text-right">{agentData.accepted}</TableCell>
                    <TableCell className="text-right">
                      <span className={agentData.rate >= 80 ? "text-green-600" : agentData.rate >= 50 ? "text-amber-600" : "text-red-600"}>
                        {agentData.rate}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={agentData.rate >= 80 ? "bg-green-100 text-green-800" : agentData.rate >= 50 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}>
                        {agentData.rate >= 80 ? "Excellent" : agentData.rate >= 50 ? "Good" : "Needs Improvement"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No agent performance data available yet. Take actions on cases or claims to see per-agent metrics.
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="fwa">
        <TabsList>
          <TabsTrigger value="fwa" data-testid="tab-fwa-feedback">FWA Feedback</TabsTrigger>
          <TabsTrigger value="claims" data-testid="tab-claims-feedback">Claims Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="fwa" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent FWA Feedback Events</CardTitle>
            </CardHeader>
            <CardContent>
              {fwaLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : fwaFeedback && fwaFeedback.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case ID</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Phase</TableHead>
                      <TableHead>AI Recommendation</TableHead>
                      <TableHead>Human Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fwaFeedback.map((event) => (
                      <TableRow key={event.id} data-testid={`fwa-feedback-${event.id}`}>
                        <TableCell className="font-mono text-sm">{event.caseId || event.entityId}</TableCell>
                        <TableCell className="capitalize">{event.entityType}</TableCell>
                        <TableCell>{event.phase}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {event.aiRecommendation?.action || "None"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge>{event.humanAction}</Badge>
                        </TableCell>
                        <TableCell>
                          {event.wasAccepted ? (
                            <Badge className="bg-green-100 text-green-800">Accepted</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800">Overridden</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={event.reviewerNotes || event.overrideReason || "-"}>
                          {event.reviewerNotes || event.overrideReason || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(event.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No FWA feedback events recorded yet. Take actions on FWA cases to see feedback data.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Claims Feedback Events</CardTitle>
            </CardHeader>
            <CardContent>
              {claimsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : claimsFeedback && claimsFeedback.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim ID</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>AI Recommendation</TableHead>
                      <TableHead>Human Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claimsFeedback.map((event) => (
                      <TableRow key={event.id} data-testid={`claims-feedback-${event.id}`}>
                        <TableCell className="font-mono text-sm">{event.claimId || event.entityId}</TableCell>
                        <TableCell className="capitalize">{event.entityType}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {event.aiRecommendation?.action || "None"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge>{event.humanAction}</Badge>
                        </TableCell>
                        <TableCell>
                          {event.wasAccepted ? (
                            <Badge className="bg-green-100 text-green-800">Accepted</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800">Overridden</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={event.reviewerNotes || event.overrideReason || "-"}>
                          {event.reviewerNotes || event.overrideReason || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(event.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No claims feedback events recorded yet. Take actions on claims to see feedback data.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            How RLHF Improves AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The platform uses Reinforcement Learning from Human Feedback (RLHF) to continuously improve AI recommendations:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">1. Action Recording</h4>
              <p className="text-sm text-muted-foreground">
                Every time a human reviewer takes an action on a case or claim, the decision is recorded along with whether they accepted or overrode the AI recommendation.
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">2. Exemplar Collection</h4>
              <p className="text-sm text-muted-foreground">
                Accepted actions become positive exemplars that demonstrate correct decisions for similar scenarios, stored for future prompt enrichment.
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">3. Prompt Enrichment</h4>
              <p className="text-sm text-muted-foreground">
                When generating new recommendations, the AI receives few-shot examples from accepted human decisions, learning to make better suggestions over time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
