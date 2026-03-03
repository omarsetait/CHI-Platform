import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { QueryErrorState } from "@/components/error-boundary";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Network,
  Users,
  AlertTriangle,
  DollarSign,
  Eye,
  BarChart,
  Circle,
  Link2,
  Trash2,
  Play,
  X,
  Building,
  User,
  Stethoscope,
  MapPin,
} from "lucide-react";
import type { RelationshipGraph, CollusionRing } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

function formatCurrency(amount: number | null | undefined): string {
  if (!amount) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getGraphTypeBadgeClasses(type: string) {
  switch (type) {
    case "provider_patient":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    case "referral_network":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    case "billing_pattern":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "full_network":
      return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
}

function getRingTypeBadgeClasses(type: string) {
  switch (type) {
    case "billing_fraud":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "kickback":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
    case "phantom_billing":
      return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
    case "upcoding_ring":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "patient_steering":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
}

function getRiskLevelBadgeClasses(level: string | null | undefined) {
  switch (level?.toLowerCase()) {
    case "critical":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "high":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "low":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
}

function getStatusBadgeClasses(status: string | null | undefined) {
  switch (status?.toLowerCase()) {
    case "detected":
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
    case "investigating":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    case "confirmed":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "referred":
      return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
    case "closed":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
}

function getNodeColor(entityType: string) {
  switch (entityType?.toLowerCase()) {
    case "provider":
      return "#3b82f6"; // blue
    case "patient":
      return "#22c55e"; // green
    case "doctor":
      return "#a855f7"; // purple
    case "facility":
      return "#f97316"; // orange
    default:
      return "#6b7280"; // gray
  }
}

function getEntityIcon(entityType: string) {
  switch (entityType?.toLowerCase()) {
    case "provider":
      return Building;
    case "patient":
      return User;
    case "doctor":
      return Stethoscope;
    case "facility":
      return MapPin;
    default:
      return Circle;
  }
}

function GraphCardSkeleton() {
  return (
    <Card data-testid="skeleton-graph-card">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Separator />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TableRowSkeleton() {
  return (
    <TableRow data-testid="skeleton-table-row">
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
    </TableRow>
  );
}

interface GraphVisualizationProps {
  graph: RelationshipGraph;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
}

function GraphVisualization({ graph, selectedNodeId, onSelectNode }: GraphVisualizationProps) {
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  const width = 600;
  const height = 400;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;

  const nodePositions = nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    return {
      ...node,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  const nodeMap = new Map(nodePositions.map((n) => [n.nodeId, n]));

  return (
    <svg
      width={width}
      height={height}
      className="border rounded-lg bg-muted/30"
      data-testid="svg-graph-visualization"
    >
      {edges.map((edge) => {
        const source = nodeMap.get(edge.sourceNodeId);
        const target = nodeMap.get(edge.targetNodeId);
        if (!source || !target) return null;
        return (
          <line
            key={edge.edgeId}
            x1={source.x}
            y1={source.y}
            x2={target.x}
            y2={target.y}
            stroke="#94a3b8"
            strokeWidth={Math.max(1, Math.min(edge.weight * 2, 4))}
            strokeOpacity={0.6}
            data-testid={`edge-${edge.edgeId}`}
          />
        );
      })}
      {nodePositions.map((node) => (
        <g
          key={node.nodeId}
          onClick={() => onSelectNode(selectedNodeId === node.nodeId ? null : node.nodeId)}
          className="cursor-pointer"
          data-testid={`node-${node.nodeId}`}
        >
          <circle
            cx={node.x}
            cy={node.y}
            r={selectedNodeId === node.nodeId ? 18 : 14}
            fill={getNodeColor(node.entityType)}
            stroke={selectedNodeId === node.nodeId ? "#1e293b" : "transparent"}
            strokeWidth={2}
          />
          <text
            x={node.x}
            y={node.y + 28}
            textAnchor="middle"
            className="text-[10px] fill-current"
          >
            {node.entityName?.substring(0, 12)}
          </text>
        </g>
      ))}
    </svg>
  );
}

interface GraphDetailDialogProps {
  graph: RelationshipGraph | null;
  open: boolean;
  onClose: () => void;
}

function GraphDetailDialog({ graph, open, onClose }: GraphDetailDialogProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  if (!graph) return null;

  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  const metrics = graph.metrics;
  const selectedNode = nodes.find((n) => n.nodeId === selectedNodeId);
  const Icon = selectedNode ? getEntityIcon(selectedNode.entityType) : Circle;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="dialog-title-graph-detail">
            <Network className="w-5 h-5" />
            {graph.name}
          </DialogTitle>
          <DialogDescription>
            {graph.description || `Graph ID: ${graph.graphId}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <GraphVisualization
              graph={graph}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground justify-center flex-wrap">
              <div className="flex items-center gap-1">
                <Circle className="w-3 h-3" style={{ color: getNodeColor("provider") }} fill={getNodeColor("provider")} />
                Provider
              </div>
              <div className="flex items-center gap-1">
                <Circle className="w-3 h-3" style={{ color: getNodeColor("patient") }} fill={getNodeColor("patient")} />
                Patient
              </div>
              <div className="flex items-center gap-1">
                <Circle className="w-3 h-3" style={{ color: getNodeColor("doctor") }} fill={getNodeColor("doctor")} />
                Doctor
              </div>
              <div className="flex items-center gap-1">
                <Circle className="w-3 h-3" style={{ color: getNodeColor("facility") }} fill={getNodeColor("facility")} />
                Facility
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Card data-testid="card-graph-metrics">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart className="w-4 h-4" />
                  Graph Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Nodes</span>
                  <span className="font-medium" data-testid="text-total-nodes">{metrics?.totalNodes ?? nodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Edges</span>
                  <span className="font-medium" data-testid="text-total-edges">{metrics?.totalEdges ?? edges.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Density</span>
                  <span className="font-medium" data-testid="text-density">{metrics?.density?.toFixed(4) ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clustering Coeff.</span>
                  <span className="font-medium" data-testid="text-clustering">{metrics?.clusteringCoefficient?.toFixed(4) ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connected Components</span>
                  <span className="font-medium" data-testid="text-components">{metrics?.connectedComponents ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Degree</span>
                  <span className="font-medium" data-testid="text-avg-degree">{metrics?.avgDegree?.toFixed(2) ?? "-"}</span>
                </div>
              </CardContent>
            </Card>

            {selectedNode && (
              <Card data-testid="card-selected-node">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    Node Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium" data-testid="text-node-name">{selectedNode.entityName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant="outline" className="text-xs capitalize" data-testid="badge-node-type">
                      {selectedNode.entityType}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entity ID</span>
                    <span className="font-mono text-xs" data-testid="text-node-entity-id">{selectedNode.entityId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risk Score</span>
                    <span className="font-medium" data-testid="text-node-risk-score">{selectedNode.riskScore}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risk Level</span>
                    <Badge variant="outline" className={`text-xs ${getRiskLevelBadgeClasses(selectedNode.riskLevel)}`} data-testid="badge-node-risk-level">
                      {selectedNode.riskLevel}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {!selectedNode && (
              <Card className="border-dashed" data-testid="card-no-selection">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  <Circle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Click a node to view details
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RingDetailDialogProps {
  ring: CollusionRing | null;
  open: boolean;
  onClose: () => void;
}

function RingDetailDialog({ ring, open, onClose }: RingDetailDialogProps) {
  if (!ring) return null;

  const members = ring.members || [];
  const evidence = ring.evidence || [];
  const financialImpact = ring.financialImpact;
  const riskAssessment = ring.riskAssessment;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="dialog-title-ring-detail">
            <Users className="w-5 h-5" />
            {ring.name}
          </DialogTitle>
          <DialogDescription>
            Ring ID: {ring.ringId} | Detection Method: {ring.detectionMethod || "Unknown"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card data-testid="card-ring-exposure">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Total Exposure</span>
              </div>
              <p className="text-2xl font-bold" data-testid="text-total-exposure">
                {formatCurrency(financialImpact?.totalExposure)}
              </p>
            </CardContent>
          </Card>
          <Card data-testid="card-ring-recovery">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Potential Recovery</span>
              </div>
              <p className="text-2xl font-bold" data-testid="text-potential-recovery">
                {formatCurrency(financialImpact?.potentialRecovery)}
              </p>
            </CardContent>
          </Card>
          <Card data-testid="card-ring-claims">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Affected Claims</span>
              </div>
              <p className="text-2xl font-bold" data-testid="text-affected-claims">
                {financialImpact?.affectedClaimsCount ?? 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card data-testid="card-ring-members">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No members identified</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {members.map((member) => {
                    const MemberIcon = getEntityIcon(member.entityType);
                    return (
                      <div
                        key={member.memberId}
                        className="flex items-center justify-between p-2 rounded-lg border"
                        data-testid={`member-${member.memberId}`}
                      >
                        <div className="flex items-center gap-2">
                          <MemberIcon className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{member.entityName}</p>
                            <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize" data-testid={`badge-evidence-${member.memberId}`}>
                            {member.evidenceStrength}
                          </Badge>
                          <span className="text-xs font-medium">{member.riskScore}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-ring-evidence">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Evidence ({evidence.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {evidence.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No evidence recorded</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {evidence.map((e) => (
                    <div
                      key={e.evidenceId}
                      className="p-2 rounded-lg border"
                      data-testid={`evidence-${e.evidenceId}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {e.type?.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Weight: {e.weight}</span>
                      </div>
                      <p className="text-sm">{e.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {ring.aiSummary && (
          <Card className="mt-4" data-testid="card-ai-summary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">AI Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{ring.aiSummary}</p>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function GraphAnalysisPage() {
  const [selectedGraph, setSelectedGraph] = useState<RelationshipGraph | null>(null);
  const [selectedRing, setSelectedRing] = useState<CollusionRing | null>(null);
  const [deleteGraphId, setDeleteGraphId] = useState<string | null>(null);

  const { data: graphs, isLoading: isLoadingGraphs, error: graphsError, refetch: refetchGraphs } = useQuery<RelationshipGraph[]>({
    queryKey: ["/api/graph-analysis/graphs"],
  });

  const { data: rings, isLoading: isLoadingRings, error: ringsError, refetch: refetchRings } = useQuery<CollusionRing[]>({
    queryKey: ["/api/graph-analysis/collusion-rings"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (graphId: string) => {
      await apiRequest("DELETE", `/api/graph-analysis/graphs/${graphId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/graph-analysis/graphs"] });
      setDeleteGraphId(null);
    },
  });

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold" data-testid="page-title">Graph Analysis</h1>
        <p className="text-muted-foreground">
          Analyze relationship graphs and detect collusion rings
        </p>
      </div>

      <section data-testid="section-relationship-graphs">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Network className="w-5 h-5" />
            Relationship Graphs
          </h2>
        </div>

        {graphsError ? (
          <QueryErrorState error={graphsError} onRetry={() => refetchGraphs()} title="Failed to load relationship graphs" />
        ) : isLoadingGraphs ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <GraphCardSkeleton key={i} />
            ))}
          </div>
        ) : !graphs || graphs.length === 0 ? (
          <Card className="border-dashed" data-testid="empty-graphs">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Network className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Graphs Found</h3>
              <p className="text-sm text-muted-foreground text-center">
                Relationship graphs will appear here once they are generated.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {graphs.map((graph) => {
              const anomalyScore = graph.analysisResults?.anomalyScore ?? 0;
              return (
                <Card
                  key={graph.graphId}
                  className="hover-elevate"
                  data-testid={`card-graph-${graph.graphId}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base" data-testid={`text-graph-name-${graph.graphId}`}>
                        {graph.name}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize shrink-0 ${getGraphTypeBadgeClasses(graph.graphType)}`}
                        data-testid={`badge-graph-type-${graph.graphId}`}
                      >
                        {graph.graphType?.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      {graph.description || `ID: ${graph.graphId}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Circle className="w-3 h-3" />
                          Nodes
                        </span>
                        <span className="font-medium" data-testid={`text-node-count-${graph.graphId}`}>
                          {graph.metrics?.totalNodes ?? graph.nodes?.length ?? 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          Edges
                        </span>
                        <span className="font-medium" data-testid={`text-edge-count-${graph.graphId}`}>
                          {graph.metrics?.totalEdges ?? graph.edges?.length ?? 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Anomaly Score
                        </span>
                        <span className="font-medium" data-testid={`text-anomaly-score-${graph.graphId}`}>
                          {anomalyScore.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <Badge
                          variant="outline"
                          className="text-xs capitalize"
                          data-testid={`badge-status-${graph.graphId}`}
                        >
                          {graph.status}
                        </Badge>
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedGraph(graph)}
                        data-testid={`button-view-graph-${graph.graphId}`}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-analyze-graph-${graph.graphId}`}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Analyze
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteGraphId(graph.graphId)}
                        data-testid={`button-delete-graph-${graph.graphId}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section data-testid="section-collusion-rings">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Collusion Rings
          </h2>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table data-testid="table-collusion-rings">
              <TableHeader>
                <TableRow>
                  <TableHead>Ring ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Financial Impact</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Investigation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ringsError ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <QueryErrorState error={ringsError} onRetry={() => refetchRings()} title="Failed to load collusion rings" />
                    </TableCell>
                  </TableRow>
                ) : isLoadingRings ? (
                  [1, 2, 3].map((i) => <TableRowSkeleton key={i} />)
                ) : !rings || rings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-rings">
                        <Users className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Collusion Rings Detected</h3>
                        <p className="text-sm text-muted-foreground">
                          Detected collusion rings will appear here.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rings.map((ring) => (
                    <TableRow
                      key={ring.ringId}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedRing(ring)}
                      data-testid={`row-ring-${ring.ringId}`}
                    >
                      <TableCell className="font-mono text-sm" data-testid={`text-ring-id-${ring.ringId}`}>
                        {ring.ringId}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-ring-name-${ring.ringId}`}>
                        {ring.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${getRingTypeBadgeClasses(ring.ringType)}`}
                          data-testid={`badge-ring-type-${ring.ringId}`}
                        >
                          {ring.ringType?.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-member-count-${ring.ringId}`}>
                        {ring.members?.length ?? 0}
                      </TableCell>
                      <TableCell data-testid={`text-exposure-${ring.ringId}`}>
                        {formatCurrency(ring.financialImpact?.totalExposure)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${getRiskLevelBadgeClasses(ring.riskAssessment?.riskLevel)}`}
                          data-testid={`badge-risk-level-${ring.ringId}`}
                        >
                          {ring.riskAssessment?.riskLevel || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${getStatusBadgeClasses(ring.status)}`}
                          data-testid={`badge-status-${ring.ringId}`}
                        >
                          {ring.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-xs capitalize"
                          data-testid={`badge-investigation-${ring.ringId}`}
                        >
                          {ring.investigationStatus || "pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <GraphDetailDialog
        graph={selectedGraph}
        open={!!selectedGraph}
        onClose={() => setSelectedGraph(null)}
      />

      <RingDetailDialog
        ring={selectedRing}
        open={!!selectedRing}
        onClose={() => setSelectedRing(null)}
      />

      <AlertDialog open={!!deleteGraphId} onOpenChange={() => setDeleteGraphId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Graph</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this graph? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGraphId && deleteMutation.mutate(deleteGraphId)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
