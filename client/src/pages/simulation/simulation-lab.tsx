import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FlaskConical,
  Copy,
  TestTube,
  Ghost,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Edit,
  Archive,
  Plus,
  Eye,
  Percent,
  ArrowUpRight,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { DigitalTwin, ShadowRule, GhostRun } from "@shared/schema";

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DigitalTwinsTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    sourceType: "",
    sourceId: "",
    purpose: "",
    notes: "",
  });

  const { data: twins, isLoading } = useQuery<DigitalTwin[]>({
    queryKey: ["/api/simulation/digital-twins"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/simulation/digital-twins", {
        twinId: `twin-${Date.now()}`,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/simulation/digital-twins"] });
      setIsCreateOpen(false);
      setFormData({ sourceType: "", sourceId: "", purpose: "", notes: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/simulation/digital-twins/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/simulation/digital-twins"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (twinId: string) => {
      return apiRequest("PATCH", `/api/simulation/digital-twins/${twinId}`, { status: "archived" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/simulation/digital-twins"] });
    },
  });

  const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    archived: { label: "Archived", className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" },
    expired: { label: "Expired", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  };

  const purposeConfig: Record<string, { label: string; className: string }> = {
    testing: { label: "Testing", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    training: { label: "Training", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
    validation: { label: "Validation", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  };

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="loading-twins">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-twins-header">Digital Twins</h2>
          <p className="text-sm text-muted-foreground">Clone cases and claims for safe testing</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-twin">
              <Plus className="w-4 h-4 mr-2" />
              Create Digital Twin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Digital Twin</DialogTitle>
              <DialogDescription>
                Clone an existing case or claim for isolated testing
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sourceType">Source Type</Label>
                <Select
                  value={formData.sourceType}
                  onValueChange={(value) => setFormData({ ...formData, sourceType: value })}
                >
                  <SelectTrigger data-testid="select-source-type">
                    <SelectValue placeholder="Select source type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fwa_case">FWA Case</SelectItem>
                    <SelectItem value="claim">Claim</SelectItem>
                    <SelectItem value="pre_auth">Pre-Authorization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceId">Source ID</Label>
                <Input
                  id="sourceId"
                  placeholder="Enter source ID"
                  value={formData.sourceId}
                  onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
                  data-testid="input-source-id"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Select
                  value={formData.purpose}
                  onValueChange={(value) => setFormData({ ...formData, purpose: value })}
                >
                  <SelectTrigger data-testid="select-purpose">
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="testing">Testing</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="validation">Validation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about this twin..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  data-testid="textarea-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel-create">
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.sourceType || !formData.sourceId || createMutation.isPending}
                data-testid="button-confirm-create"
              >
                {createMutation.isPending ? "Creating..." : "Create Twin"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(!twins || twins.length === 0) ? (
        <Card data-testid="empty-state-twins">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Copy className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Digital Twins</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Create a digital twin to safely test changes without affecting production data
            </p>
            <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-twin">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Twin
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {twins.map((twin) => (
            <Card key={twin.id} data-testid={`card-twin-${twin.twinId}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Copy className="w-4 h-4 text-primary" />
                    <CardTitle className="text-sm font-medium">{twin.twinId}</CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className={statusConfig[twin.status || "active"]?.className}
                    data-testid={`badge-twin-status-${twin.twinId}`}
                  >
                    {statusConfig[twin.status || "active"]?.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Source Type</p>
                    <p className="font-medium">{twin.sourceType}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Source ID</p>
                    <p className="font-medium truncate">{twin.sourceId}</p>
                  </div>
                </div>
                {twin.purpose && (
                  <Badge
                    variant="outline"
                    className={purposeConfig[twin.purpose]?.className}
                    data-testid={`badge-twin-purpose-${twin.twinId}`}
                  >
                    {purposeConfig[twin.purpose]?.label}
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground">
                  Created {formatDate(twin.createdAt)}
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" data-testid={`button-view-twin-${twin.twinId}`}>
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => archiveMutation.mutate(twin.id)}
                    disabled={twin.status === "archived"}
                    data-testid={`button-archive-twin-${twin.twinId}`}
                  >
                    <Archive className="w-3 h-3 mr-1" />
                    Archive
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(twin.id)}
                    data-testid={`button-delete-twin-${twin.twinId}`}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ShadowRulesTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: rules, isLoading } = useQuery<ShadowRule[]>({
    queryKey: ["/api/simulation/shadow-rules"],
  });

  const statusConfig: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" },
    testing: { label: "Testing", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    validated: { label: "Validated", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    promoted: { label: "Promoted", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  };

  const runTestsMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/simulation/shadow-rules/${id}/run-tests`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/simulation/shadow-rules"] });
    },
  });

  const promoteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/simulation/shadow-rules/${id}/promote`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/simulation/shadow-rules"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/simulation/shadow-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/simulation/shadow-rules"] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="loading-rules">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-rules-header">Shadow Knowledge Base</h2>
          <p className="text-sm text-muted-foreground">Test rule configurations in isolation before promotion</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-rule">
              <Plus className="w-4 h-4 mr-2" />
              Create Shadow Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Shadow Rule</DialogTitle>
              <DialogDescription>
                Create a new rule for testing in the shadow environment
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Rule Name</Label>
                <Input placeholder="Enter rule name" data-testid="input-rule-name" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Describe the rule..." data-testid="textarea-rule-description" />
              </div>
              <div className="space-y-2">
                <Label>Base Rule (Optional)</Label>
                <Input placeholder="Enter base rule ID to shadow" data-testid="input-base-rule" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel-rule">
                Cancel
              </Button>
              <Button data-testid="button-confirm-rule">Create Rule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(!rules || rules.length === 0) ? (
        <Card data-testid="empty-state-rules">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TestTube className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Shadow Rules</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Create shadow rules to test configurations before deploying to production
            </p>
            <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-rule">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rules.map((rule) => {
            const testCases = rule.testCases || [];
            const validationResults = rule.validationResults;
            const accuracy = validationResults?.accuracy ?? 0;

            return (
              <Card key={rule.id} data-testid={`card-rule-${rule.ruleSetId}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-medium">{rule.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">{rule.description}</CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className={statusConfig[rule.status || "draft"]?.className}
                      data-testid={`badge-rule-status-${rule.ruleSetId}`}
                    >
                      {statusConfig[rule.status || "draft"]?.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <TestTube className="w-3 h-3 text-muted-foreground" />
                      <span>{testCases.length} test cases</span>
                    </div>
                    {validationResults && (
                      <div className="flex items-center gap-1">
                        <Percent className="w-3 h-3 text-muted-foreground" />
                        <span className={accuracy >= 80 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}>
                          {accuracy.toFixed(1)}% accuracy
                        </span>
                      </div>
                    )}
                  </div>
                  {validationResults && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>{validationResults.passed} passed</span>
                      <XCircle className="w-3 h-3 text-red-500" />
                      <span>{validationResults.failed} failed</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2 flex-wrap">
                    <Button variant="outline" size="sm" data-testid={`button-edit-rule-${rule.ruleSetId}`}>
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runTestsMutation.mutate(rule.id)}
                      disabled={runTestsMutation.isPending}
                      data-testid={`button-run-tests-${rule.ruleSetId}`}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Run Tests
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => promoteMutation.mutate(rule.id)}
                      disabled={rule.status !== "validated" || promoteMutation.isPending}
                      data-testid={`button-promote-rule-${rule.ruleSetId}`}
                    >
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                      Promote
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(rule.id)}
                      data-testid={`button-delete-rule-${rule.ruleSetId}`}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GhostRunsTab() {
  const [selectedRun, setSelectedRun] = useState<GhostRun | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: runs, isLoading } = useQuery<GhostRun[]>({
    queryKey: ["/api/simulation/ghost-runs"],
  });

  const statusConfig: Record<string, { label: string; className: string; icon: typeof Clock }> = {
    pending: { label: "Pending", className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200", icon: Clock },
    running: { label: "Running", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Play },
    completed: { label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle },
    failed: { label: "Failed", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: XCircle },
  };

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="loading-runs">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-runs-header">Ghost Runs</h2>
          <p className="text-sm text-muted-foreground">Execute AI agents in simulation mode and compare outputs</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-ghost-run">
              <Plus className="w-4 h-4 mr-2" />
              New Ghost Run
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Ghost Run</DialogTitle>
              <DialogDescription>
                Execute an AI agent in simulation mode
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Agent Type</Label>
                <Select>
                  <SelectTrigger data-testid="select-agent-type">
                    <SelectValue placeholder="Select agent type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A1-provider-claims-analyzer">A1 - Provider Claims Analyzer</SelectItem>
                    <SelectItem value="A2-pattern-detector">A2 - Pattern Detector</SelectItem>
                    <SelectItem value="A3-action-recommender">A3 - Action Recommender</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Type</Label>
                <Select>
                  <SelectTrigger data-testid="select-target-type">
                    <SelectValue placeholder="Select target type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fwa_case">FWA Case</SelectItem>
                    <SelectItem value="claim">Claim</SelectItem>
                    <SelectItem value="pre_auth">Pre-Authorization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target ID</Label>
                <Input placeholder="Enter target ID" data-testid="input-target-id" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel-run">
                Cancel
              </Button>
              <Button data-testid="button-start-run">Start Run</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(!runs || runs.length === 0) ? (
        <Card data-testid="empty-state-runs">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ghost className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Ghost Runs</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Start a ghost run to execute AI agents in simulation mode and compare outputs
            </p>
            <Button onClick={() => setIsCreateOpen(true)} data-testid="button-start-first-run">
              <Plus className="w-4 h-4 mr-2" />
              Start Your First Ghost Run
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run ID</TableHead>
                  <TableHead>Agent Type</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Target ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Match Score</TableHead>
                  <TableHead>Execution Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => {
                  const status = statusConfig[run.status || "pending"];
                  const matchScore = run.comparison?.matchScore;

                  return (
                    <TableRow
                      key={run.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedRun(run)}
                      data-testid={`row-run-${run.runId}`}
                    >
                      <TableCell className="font-medium">{run.runId}</TableCell>
                      <TableCell>{run.agentType}</TableCell>
                      <TableCell>{run.phase || "-"}</TableCell>
                      <TableCell>{run.entityType || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{run.targetId}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={status.className}
                          data-testid={`badge-run-status-${run.runId}`}
                        >
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {matchScore !== undefined ? (
                          <span className={matchScore >= 80 ? "text-green-600 dark:text-green-400" : matchScore >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}>
                            {matchScore.toFixed(1)}%
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {run.executionTimeMs ? `${run.executionTimeMs}ms` : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <Dialog open={!!selectedRun} onOpenChange={() => setSelectedRun(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Ghost Run Comparison</DialogTitle>
                <DialogDescription>
                  Run ID: {selectedRun?.runId}
                </DialogDescription>
              </DialogHeader>
              {selectedRun && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Ghost className="w-4 h-4" />
                          Ghost Output
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm">
                        {selectedRun.ghostOutput ? (
                          <div className="space-y-2">
                            <p><strong>Recommendation:</strong> {selectedRun.ghostOutput.recommendation}</p>
                            <p><strong>Risk Score:</strong> {selectedRun.ghostOutput.riskScore}</p>
                            <p><strong>Findings:</strong> {selectedRun.ghostOutput.findings?.length || 0}</p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No output yet</p>
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Play className="w-4 h-4" />
                          Production Output
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm">
                        {selectedRun.productionOutput ? (
                          <div className="space-y-2">
                            <p><strong>Recommendation:</strong> {selectedRun.productionOutput.recommendation}</p>
                            <p><strong>Risk Score:</strong> {selectedRun.productionOutput.riskScore}</p>
                            <p><strong>Findings:</strong> {selectedRun.productionOutput.findings?.length || 0}</p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No output yet</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  {selectedRun.comparison && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Comparison Results</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span>Match Score</span>
                          <span className={`font-bold ${selectedRun.comparison.matchScore >= 80 ? "text-green-600" : selectedRun.comparison.matchScore >= 50 ? "text-amber-600" : "text-red-600"}`}>
                            {selectedRun.comparison.matchScore.toFixed(1)}%
                          </span>
                        </div>
                        {selectedRun.comparison.discrepancies && selectedRun.comparison.discrepancies.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Discrepancies:</p>
                            <ul className="text-sm space-y-1">
                              {selectedRun.comparison.discrepancies.map((d, i) => (
                                <li key={i} className="text-muted-foreground">
                                  {d.field}: Ghost={String(d.ghostValue)} vs Prod={String(d.productionValue)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {selectedRun.comparison.overallAssessment && (
                          <p className="text-sm text-muted-foreground">{selectedRun.comparison.overallAssessment}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedRun(null)} data-testid="button-close-comparison">
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

export default function SimulationLab() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FlaskConical className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Simulation Lab</h1>
          <p className="text-muted-foreground">Phase 0 testing environment for safe experimentation</p>
        </div>
      </div>

      <Tabs defaultValue="digital-twins" className="space-y-4">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="digital-twins" data-testid="tab-digital-twins">
            <Copy className="w-4 h-4 mr-2" />
            Digital Twins
          </TabsTrigger>
          <TabsTrigger value="shadow-rules" data-testid="tab-shadow-rules">
            <TestTube className="w-4 h-4 mr-2" />
            Shadow Rules
          </TabsTrigger>
          <TabsTrigger value="ghost-runs" data-testid="tab-ghost-runs">
            <Ghost className="w-4 h-4 mr-2" />
            Ghost Runs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="digital-twins" data-testid="content-digital-twins">
          <DigitalTwinsTab />
        </TabsContent>

        <TabsContent value="shadow-rules" data-testid="content-shadow-rules">
          <ShadowRulesTab />
        </TabsContent>

        <TabsContent value="ghost-runs" data-testid="content-ghost-runs">
          <GhostRunsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
