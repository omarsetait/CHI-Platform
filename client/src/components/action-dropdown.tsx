import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  MoreHorizontal,
  DollarSign,
  AlertTriangle,
  Eye,
  GraduationCap,
  FileText,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  HelpCircle,
  Flag,
  Archive,
  Clock,
  Loader2,
  UserPlus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export type ActionType =
  | "initiate_enforcement"
  | "apply_penalty"
  | "enhanced_monitoring"
  | "compliance_training"
  | "contract_review"
  | "escalate"
  | "approve"
  | "reject"
  | "request_info"
  | "flag_for_review"
  | "close_case"
  | "defer"
  | "assign_to_user";

interface ActionConfig {
  label: string;
  icon: typeof DollarSign;
  description: string;
  requiresNote: boolean;
  variant: "default" | "destructive" | "warning" | "success";
}

const actionConfigs: Record<ActionType, ActionConfig> = {
  initiate_enforcement: {
    label: "Initiate Enforcement",
    icon: DollarSign,
    description: "Start enforcement proceedings for regulatory action",
    requiresNote: true,
    variant: "default",
  },
  apply_penalty: {
    label: "Apply Penalty",
    icon: AlertTriangle,
    description: "Apply financial or contractual penalties",
    requiresNote: true,
    variant: "destructive",
  },
  enhanced_monitoring: {
    label: "Enhanced Monitoring",
    icon: Eye,
    description: "Flag for ongoing surveillance and review",
    requiresNote: false,
    variant: "warning",
  },
  compliance_training: {
    label: "Request Training",
    icon: GraduationCap,
    description: "Mandate compliance training for provider",
    requiresNote: false,
    variant: "default",
  },
  contract_review: {
    label: "Contract Review",
    icon: FileText,
    description: "Trigger contract re-evaluation",
    requiresNote: true,
    variant: "default",
  },
  escalate: {
    label: "Escalate",
    icon: ArrowUpRight,
    description: "Escalate to senior reviewer or committee",
    requiresNote: true,
    variant: "warning",
  },
  approve: {
    label: "Approve",
    icon: CheckCircle,
    description: "Approve the claim or case",
    requiresNote: false,
    variant: "success",
  },
  reject: {
    label: "Reject",
    icon: XCircle,
    description: "Reject the claim or case",
    requiresNote: true,
    variant: "destructive",
  },
  request_info: {
    label: "Request Info",
    icon: HelpCircle,
    description: "Request additional information",
    requiresNote: true,
    variant: "default",
  },
  flag_for_review: {
    label: "Flag for Review",
    icon: Flag,
    description: "Flag for further investigation",
    requiresNote: false,
    variant: "warning",
  },
  close_case: {
    label: "Close Case",
    icon: Archive,
    description: "Close the case as resolved",
    requiresNote: true,
    variant: "success",
  },
  defer: {
    label: "Defer",
    icon: Clock,
    description: "Defer decision for later",
    requiresNote: false,
    variant: "default",
  },
  assign_to_user: {
    label: "Assign to User",
    icon: UserPlus,
    description: "Assign this case to a team member",
    requiresNote: true,
    variant: "default",
  },
};

// Team members for case assignment (static configuration)
const teamMembers = [
  { id: "user-1", name: "Ahmed Al-Hassan", role: "Senior Investigator" },
  { id: "user-2", name: "Fatima Al-Rashid", role: "FWA Analyst" },
  { id: "user-3", name: "Omar Al-Qahtani", role: "Claims Reviewer" },
  { id: "user-4", name: "Sara Al-Fahad", role: "Audit Specialist" },
  { id: "user-5", name: "Khalid Al-Mansour", role: "Team Lead" },
];

// Phase-specific action groups for FWA workflow
const phaseActions: Record<string, ActionType[]> = {
  // A1: Analysis & Intelligence - Investigation-focused actions
  A1: [
    "assign_to_user",
    "request_info",
    "enhanced_monitoring",
    "flag_for_review",
    "escalate",
    "defer",
  ],
  // A2: Categorization & Classification - Decision-focused actions
  A2: [
    "assign_to_user",
    "flag_for_review",
    "escalate",
    "request_info",
    "defer",
    "close_case",
  ],
  // A3: Prospective Actions & Retrospective Review - Remediation actions
  A3: [
    "assign_to_user",
    "initiate_enforcement",
    "apply_penalty",
    "compliance_training",
    "contract_review",
    "enhanced_monitoring",
    "close_case",
  ],
};

// Get actions based on phase for FWA module
export function getActionsForPhase(phase?: string): ActionType[] {
  if (phase && phaseActions[phase]) {
    return phaseActions[phase];
  }
  // Default to all FWA actions if no phase specified
  return [
    "initiate_enforcement",
    "apply_penalty",
    "enhanced_monitoring",
    "compliance_training",
    "contract_review",
    "escalate",
    "close_case",
  ];
}

interface ActionDropdownProps {
  entityId: string;
  entityType: "case" | "claim";
  entityName?: string;
  module: "fwa" | "claims";
  phase?: string;
  aiRecommendation?: {
    action: string;
    priority: string;
    confidence: number;
    rationale: string;
  };
  availableActions?: ActionType[];
  onActionComplete?: (action: ActionType) => void;
}

export function ActionDropdown({
  entityId,
  entityType,
  entityName,
  module,
  phase,
  aiRecommendation,
  availableActions,
  onActionComplete,
}: ActionDropdownProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");

  const defaultClaimActions: ActionType[] = [
    "approve",
    "reject",
    "request_info",
    "flag_for_review",
    "escalate",
    "defer",
  ];

  // Use phase-aware actions for FWA module, or fall back to claims actions
  const actions = availableActions || (module === "fwa" ? getActionsForPhase(phase) : defaultClaimActions);

  const submitAction = useMutation({
    mutationFn: async (data: { action: ActionType; notes: string; assigneeId?: string }) => {
      const wasAccepted = aiRecommendation?.action === data.action;
      
      // Handle assignment action differently - update case directly
      if (data.action === "assign_to_user" && data.assigneeId) {
        const assignee = teamMembers.find(m => m.id === data.assigneeId);
        const assigneeName = assignee?.name || data.assigneeId;
        
        if (module === "fwa" && entityType === "case") {
          // Update the case with the new assignee
          return apiRequest("PATCH", `/api/fwa/cases/${entityId}`, {
            assignedTo: assigneeName,
          });
        }
        throw new Error("Assignment is only supported for FWA cases");
      }
      
      // For other actions, use the FWA action endpoint with proper schema
      if (module === "fwa") {
        const actionTypeMap: Record<string, string> = {
          initiate_enforcement: "retrospective",
          apply_penalty: "retrospective",
          compliance_training: "prospective",
          contract_review: "prospective",
          enhanced_monitoring: "prospective",
          escalate: "prospective",
          approve: "prospective",
          reject: "retrospective",
          request_info: "prospective",
          flag_for_review: "prospective",
          close_case: "prospective",
          defer: "prospective",
        };
        
        const actionTrackMap: Record<string, string> = {
          initiate_enforcement: "enforcement",
          apply_penalty: "penalty",
          compliance_training: "education",
          contract_review: "provider_restrictions",
          enhanced_monitoring: "enhanced_monitoring",
          escalate: "enhanced_monitoring",
          approve: "provider_restrictions",
          reject: "claim_rejection",
          request_info: "enhanced_monitoring",
          flag_for_review: "enhanced_monitoring",
          close_case: "provider_restrictions",
          defer: "enhanced_monitoring",
        };
        
        const fwaPayload = {
          caseId: entityId,
          actionType: actionTypeMap[data.action] || "preventive",
          actionTrack: actionTrackMap[data.action] || "enhanced_monitoring",
          justification: data.notes || `Action: ${data.action}`,
          executedBy: "Current User",
          status: "pending",
        };
        
        return apiRequest("POST", `/api/fwa/cases/${entityId}/actions`, fwaPayload);
      }
      
      // For claims module
      const claimsPayload = {
        claimId: entityId,
        entityId,
        entityType,
        phase: phase || "unknown",
        aiRecommendation,
        humanAction: data.action,
        wasAccepted,
        overrideReason: !wasAccepted && data.notes ? data.notes : undefined,
        reviewerNotes: data.notes || undefined,
      };
      
      return apiRequest("POST", "/api/claims/actions", claimsPayload);
    },
    onSuccess: (_, variables) => {
      const config = actionConfigs[variables.action];
      const isAssignment = variables.action === "assign_to_user";
      
      toast({
        title: isAssignment ? "Case Assigned" : "Action Recorded",
        description: isAssignment 
          ? `Case has been assigned to ${teamMembers.find(m => m.id === variables.assigneeId)?.name || "team member"}`
          : `${config.label} has been applied to ${entityName || entityId}`,
      });
      setDialogOpen(false);
      setNotes("");
      setSelectedAction(null);
      setSelectedAssignee("");
      
      // Invalidate all related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/cases", entityId] });
      queryClient.invalidateQueries({ queryKey: ["/api/claims"] });
      queryClient.invalidateQueries({ queryKey: ["/api/demo/fwa-cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/demo/claims"] });
      
      onActionComplete?.(variables.action);
    },
    onError: (error: Error) => {
      toast({
        title: "Action Failed",
        description: error.message || "Failed to record action",
        variant: "destructive",
      });
    },
  });

  const handleActionClick = (action: ActionType) => {
    const config = actionConfigs[action];
    if (config.requiresNote) {
      setSelectedAction(action);
      setDialogOpen(true);
    } else {
      submitAction.mutate({ action, notes: "" });
    }
  };

  const handleConfirm = () => {
    if (selectedAction) {
      if (selectedAction === "assign_to_user" && !selectedAssignee) {
        toast({
          title: "Select Assignee",
          description: "Please select a team member to assign this case to.",
          variant: "destructive",
        });
        return;
      }
      submitAction.mutate({ 
        action: selectedAction, 
        notes,
        assigneeId: selectedAction === "assign_to_user" ? selectedAssignee : undefined,
      });
    }
  };

  const selectedConfig = selectedAction ? actionConfigs[selectedAction] : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            data-testid={`action-dropdown-${entityId}`}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((action) => {
            const config = actionConfigs[action];
            const Icon = config.icon;
            const isRecommended = aiRecommendation?.action === action;
            return (
              <DropdownMenuItem
                key={action}
                onClick={() => handleActionClick(action)}
                data-testid={`action-${action}-${entityId}`}
                className="cursor-pointer"
              >
                <Icon className="w-4 h-4 mr-2" />
                <span className="flex-1">{config.label}</span>
                {isRecommended && (
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    AI
                  </span>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedConfig && (
                <>
                  <selectedConfig.icon className="w-5 h-5" />
                  {selectedConfig.label}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedConfig?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedAction === "assign_to_user" && (
              <div className="space-y-2">
                <Label htmlFor="assignee">Assign To</Label>
                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                  <SelectTrigger data-testid="select-assignee">
                    <SelectValue placeholder="Select team member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex flex-col">
                          <span>{member.name}</span>
                          <span className="text-xs text-muted-foreground">{member.role}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="notes">{selectedAction === "assign_to_user" ? "Assignment Notes" : "Notes / Rationale"}</Label>
              <Textarea
                id="notes"
                placeholder={selectedAction === "assign_to_user" 
                  ? "Add any notes for the assignee (priority, deadline, context)..." 
                  : "Enter your notes or reason for this action..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                data-testid="input-action-notes"
              />
            </div>
            
            {aiRecommendation && selectedAction !== aiRecommendation.action && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Override AI Recommendation
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  AI recommended: <strong>{aiRecommendation.action}</strong> with {Math.round(aiRecommendation.confidence * 100)}% confidence
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={submitAction.isPending}
              data-testid="button-confirm-action"
            >
              {submitAction.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
