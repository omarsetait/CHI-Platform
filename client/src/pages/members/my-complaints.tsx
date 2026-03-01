import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  StatusTimeline,
  type TimelineStep,
} from "@/components/portal/status-timeline";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  User,
  MessageSquare,
  Plus,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

interface Member {
  code: string;
  name: string;
  nameAr: string;
  iqamaNo: string;
  policyNumber: string;
  employerName: string;
  insurerName: string;
  planTier: string;
  nationality: string;
  age: number;
  gender: string;
  city: string;
  region: string;
  dependentsCount: number;
  policyValidUntil: string;
}

interface MemberResponse {
  member: Member;
  generatedAt: string;
}

interface ComplaintMessage {
  sender: string;
  text: string;
  date: string;
}

interface Complaint {
  ticketNumber: string;
  type: string;
  description: string;
  status: string;
  assignedTo: string;
  estimatedResolution: string;
  timeline: TimelineStep[];
  messages: ComplaintMessage[];
  outcome: string | null;
  submittedAt: string;
  resolvedAt: string | null;
}

interface ComplaintsResponse {
  total: number;
  open: number;
  complaints: Complaint[];
  generatedAt: string;
}

// ── Complaint Types ────────────────────────────────────────────────

const COMPLAINT_TYPES = [
  "Claim Denial",
  "Billing Dispute",
  "Coverage Question",
  "Provider Quality",
  "Other",
];

// ── Helpers ────────────────────────────────────────────────────────

function statusColor(status: string) {
  const s = status?.toLowerCase() || "";
  if (s === "closed" || s === "resolved")
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s === "in_progress" || s === "in progress" || s === "under_review")
    return "bg-blue-100 text-blue-800 border-blue-200";
  if (s === "escalated")
    return "bg-red-100 text-red-800 border-red-200";
  return "bg-amber-100 text-amber-800 border-amber-200";
}

function typeColor(type: string) {
  switch (type) {
    case "Claim Denial":
      return "bg-red-100 text-red-700 border-red-200";
    case "Billing Dispute":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "Coverage Question":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "Provider Quality":
      return "bg-purple-100 text-purple-700 border-purple-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function computeResolutionDays(submittedAt: string, resolvedAt: string | null): string {
  if (!resolvedAt) return "—";
  const start = new Date(submittedAt);
  const end = new Date(resolvedAt);
  const diffMs = end.getTime() - start.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return `${days} day${days !== 1 ? "s" : ""}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ── Main Component ─────────────────────────────────────────────────

export default function MyComplaintsPage() {
  const { code } = useParams<{ code: string }>();
  const { toast } = useToast();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newType, setNewType] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Historical toggle
  const [showHistorical, setShowHistorical] = useState(false);

  const { data: memberData, isLoading: memberLoading } =
    useQuery<MemberResponse>({
      queryKey: ["/api/members/portal/member", code],
      queryFn: () =>
        fetch(`/api/members/portal/member/${code}`).then((r) => r.json()),
      enabled: !!code,
    });

  const { data: complaintsData, isLoading: complaintsLoading } =
    useQuery<ComplaintsResponse>({
      queryKey: ["/api/members/portal/member", code, "complaints"],
      queryFn: () =>
        fetch(`/api/members/portal/member/${code}/complaints`).then((r) =>
          r.json()
        ),
      enabled: !!code,
    });

  const member = memberData?.member;
  const complaints = complaintsData?.complaints ?? [];

  const activeComplaints = useMemo(
    () => complaints.filter((c) => c.status?.toLowerCase() !== "closed"),
    [complaints]
  );

  const historicalComplaints = useMemo(
    () => complaints.filter((c) => c.status?.toLowerCase() === "closed"),
    [complaints]
  );

  const handleSubmitComplaint = () => {
    if (!newType || !newDescription.trim()) return;

    const fakeTicket = `TKT-${Date.now().toString(36).toUpperCase()}`;
    toast({
      title: "Complaint Submitted",
      description: `Your complaint has been filed successfully. Ticket: ${fakeTicket}`,
    });
    setDialogOpen(false);
    setNewType("");
    setNewDescription("");
  };

  if (!code) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No member code provided.
      </div>
    );
  }

  if (memberLoading || complaintsLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Member not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Condensed Member Header */}
      <div className="flex items-center justify-between p-4 rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-purple-50 text-purple-600 shrink-0">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{member.name}</h1>
            <p className="text-xs text-muted-foreground">
              {member.policyNumber} &middot; {member.insurerName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="font-medium">
            {complaintsData?.total ?? 0} total
          </span>
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 text-xs"
          >
            {complaintsData?.open ?? 0} open
          </Badge>
        </div>
      </div>

      {/* File New Complaint Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          File New Complaint
        </button>
      </div>

      {/* Active Complaints */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          Active Complaints ({activeComplaints.length})
        </h2>

        {activeComplaints.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-8 text-center text-muted-foreground">
              No active complaints. All issues have been resolved.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeComplaints.map((complaint) => (
              <Card key={complaint.ticketNumber} className="shadow-sm border-l-4 border-l-purple-400">
                <CardContent className="p-5 space-y-4">
                  {/* Header: Ticket + Type + Date */}
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className="font-mono text-xs bg-purple-50 text-purple-700 border-purple-200"
                      >
                        {complaint.ticketNumber}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", typeColor(complaint.type))}
                      >
                        {complaint.type}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", statusColor(complaint.status))}
                      >
                        {complaint.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(complaint.submittedAt)}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-foreground leading-relaxed">
                    {complaint.description}
                  </p>

                  {/* Estimated Resolution */}
                  {complaint.estimatedResolution && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        Est. Resolution: {complaint.estimatedResolution}
                      </span>
                    </div>
                  )}

                  {/* Timeline */}
                  {complaint.timeline && complaint.timeline.length > 0 && (
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Status Timeline
                      </h4>
                      <StatusTimeline steps={complaint.timeline} />
                    </div>
                  )}

                  {/* Messages Thread */}
                  {complaint.messages && complaint.messages.length > 0 && (
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Messages
                      </h4>
                      <div className="space-y-3">
                        {complaint.messages.map((msg, idx) => {
                          const isMember =
                            msg.sender?.toLowerCase() === "member";
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "flex",
                                isMember ? "justify-end" : "justify-start"
                              )}
                            >
                              <div
                                className={cn(
                                  "max-w-[80%] rounded-lg px-3 py-2 space-y-1",
                                  isMember
                                    ? "bg-purple-100 text-purple-900"
                                    : "bg-white border text-foreground"
                                )}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                                    {msg.sender}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatDate(msg.date)}
                                  </span>
                                </div>
                                <p className="text-sm leading-relaxed">
                                  {msg.text}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Historical Complaints */}
      <div>
        <button
          onClick={() => setShowHistorical((prev) => !prev)}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          Historical Complaints ({historicalComplaints.length})
          {showHistorical ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {showHistorical && (
          <div className="mt-3 space-y-3">
            {historicalComplaints.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  No historical complaints.
                </CardContent>
              </Card>
            ) : (
              historicalComplaints.map((complaint) => (
                <Card
                  key={complaint.ticketNumber}
                  className="shadow-sm border-l-4 border-l-emerald-300"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="font-mono text-xs bg-gray-50 text-gray-600 border-gray-200"
                        >
                          {complaint.ticketNumber}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", typeColor(complaint.type))}
                        >
                          {complaint.type}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(complaint.submittedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {complaint.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      {complaint.outcome && (
                        <span className="text-emerald-700 font-medium">
                          Outcome: {complaint.outcome}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        Resolution time:{" "}
                        {computeResolutionDays(
                          complaint.submittedAt,
                          complaint.resolvedAt
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* File New Complaint Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>File a New Complaint</DialogTitle>
            <DialogDescription>
              Describe your issue and we will assign it to the appropriate team
              for resolution.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Complaint Type
              </label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a type..." />
                </SelectTrigger>
                <SelectContent>
                  {COMPLAINT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Description
              </label>
              <Textarea
                placeholder="Describe your complaint in detail..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setDialogOpen(false)}
              className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitComplaint}
              disabled={!newType || !newDescription.trim()}
              className="px-4 py-2 rounded-md bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Complaint
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
