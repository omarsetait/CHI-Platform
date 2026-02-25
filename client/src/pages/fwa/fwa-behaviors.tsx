import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InlineLoader } from "@/components/ui/loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus,
  Search,
  CheckCircle2,
  FolderOpen,
  Target,
  FileWarning,
  Eye,
  Edit,
} from "lucide-react";

type BehaviorStatus = "active" | "draft" | "deprecated";
type BehaviorSeverity = "fraud" | "waste" | "abuse";
type BehaviorPriority = "critical" | "high" | "medium" | "low";
type BehaviorDecision = "auto_reject" | "manual_review";

type BehaviorCategory = 
  | "impossible_procedures"
  | "duplicate_claims"
  | "lab_unbundling"
  | "coding_fraud"
  | "billing_fraud"
  | "identity_fraud"
  | "documentation_fraud"
  | "provider_pattern"
  | "patient_pattern";

interface FWABehavior {
  id: string;
  behaviorCode: string;
  name: string;
  description: string;
  category: BehaviorCategory;
  severity: BehaviorSeverity;
  priority: BehaviorPriority;
  status: BehaviorStatus;
  decision: BehaviorDecision;
  rejectionMessage?: string;
  technicalLogic?: string;
  dataRequired?: string[];
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const categoryLabels: Record<BehaviorCategory, string> = {
  impossible_procedures: "Impossible Procedures",
  duplicate_claims: "Duplicate Claims",
  lab_unbundling: "Lab Test Unbundling",
  coding_fraud: "Coding Fraud (Upcoding/Unbundling)",
  billing_fraud: "Billing Fraud",
  identity_fraud: "Identity Fraud",
  documentation_fraud: "Documentation Fraud",
  provider_pattern: "Provider Pattern Analysis",
  patient_pattern: "Patient Pattern Analysis",
};

export default function FWABehaviors() {
  const { data: behaviors = [], isLoading } = useQuery<FWABehavior[]>({
    queryKey: ['/api/fwa/behaviors'],
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const filteredBehaviors = behaviors.filter((behavior) => {
    const matchesSearch = 
      behavior.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      behavior.behaviorCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      behavior.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || behavior.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || behavior.category === categoryFilter;
    const matchesSeverity = severityFilter === "all" || behavior.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesCategory && matchesSeverity;
  });

  const activeBehaviors = behaviors.filter((b) => b.status === "active").length;
  const uniqueCategories = new Set(behaviors.map((b) => b.category)).size;
  const totalBehaviors = behaviors.length;

  const getStatusBadge = (status: BehaviorStatus) => {
    const config = {
      active: { label: "Active", variant: "default" as const },
      draft: { label: "Draft", variant: "outline" as const },
      deprecated: { label: "Deprecated", variant: "secondary" as const },
    };
    return config[status];
  };

  const getSeverityBadge = (severity: BehaviorSeverity) => {
    const config = {
      fraud: { label: "Fraud", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
      waste: { label: "Waste", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
      abuse: { label: "Abuse", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
    };
    return config[severity];
  };

  const getPriorityBadge = (priority: BehaviorPriority) => {
    const config = {
      critical: { label: "Critical", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
      high: { label: "High", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
      medium: { label: "Medium", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
      low: { label: "Low", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    };
    return config[priority];
  };

  const getDecisionBadge = (decision: BehaviorDecision) => {
    const config = {
      auto_reject: { label: "Auto-Reject", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
      manual_review: { label: "Manual Review", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    };
    return config[decision];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]" data-testid="loading-behaviors">
        <InlineLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-fwa-behaviors">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Inappropriate Care Behaviors Catalog</h2>
          <p className="text-muted-foreground">
            Manage inappropriate care detection behaviors
          </p>
        </div>
        <Button className="gap-2" data-testid="button-add-fwa-behavior">
          <Plus className="h-4 w-4" />
          Add Behavior
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Active Behaviors</p>
                <p className="text-2xl font-bold" data-testid="text-active-behaviors">
                  {activeBehaviors}
                </p>
              </div>
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold" data-testid="text-categories-count">
                  {uniqueCategories}
                </p>
              </div>
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <FolderOpen className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Behaviors</p>
                <p className="text-2xl font-bold" data-testid="text-total-behaviors">
                  {totalBehaviors}
                </p>
              </div>
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Draft Behaviors</p>
                <p className="text-2xl font-bold" data-testid="text-draft-behaviors">
                  {behaviors.filter((b) => b.status === "draft").length}
                </p>
              </div>
              <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <FileWarning className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search behaviors by code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-behaviors"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[220px]" data-testid="select-category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="deprecated">Deprecated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-severity-filter">
                <SelectValue placeholder="All Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="fraud">Fraud</SelectItem>
                <SelectItem value="waste">Waste</SelectItem>
                <SelectItem value="abuse">Abuse</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[80px]">Code</TableHead>
                <TableHead>Behavior Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBehaviors.map((behavior) => {
                const statusConfig = getStatusBadge(behavior.status);
                const severityConfig = getSeverityBadge(behavior.severity);
                const priorityConfig = getPriorityBadge(behavior.priority);
                const decisionConfig = getDecisionBadge(behavior.decision);

                return (
                  <TableRow key={behavior.id} data-testid={`row-behavior-${behavior.behaviorCode}`}>
                    <TableCell className="font-mono font-medium">
                      {behavior.behaviorCode}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{behavior.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {behavior.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {categoryLabels[behavior.category]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={severityConfig.className}
                      >
                        {severityConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={priorityConfig.className}
                      >
                        {priorityConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={decisionConfig.className}
                      >
                        {decisionConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          data-testid={`button-view-${behavior.behaviorCode}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          data-testid={`button-edit-${behavior.behaviorCode}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredBehaviors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No behaviors found matching your filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}
