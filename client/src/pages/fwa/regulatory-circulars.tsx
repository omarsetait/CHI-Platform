import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Eye,
  FileText,
  Send,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Mail,
  Loader2,
} from "lucide-react";
import type { RegulatoryCircular } from "@shared/schema";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  review: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  published: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  superseded: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

const typeColors: Record<string, string> = {
  policy_update: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  enforcement_notice: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  guidance: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  compliance_bulletin: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  market_alert: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  technical_bulletin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export default function RegulatoryCirculars() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedCircular, setSelectedCircular] = useState<RegulatoryCircular | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [emailToSend, setEmailToSend] = useState<RegulatoryCircular | null>(null);
  const [sendToAll, setSendToAll] = useState(true);
  const [customEmails, setCustomEmails] = useState("");
  const [newCircular, setNewCircular] = useState({
    title: "",
    type: "guidance" as "policy_update" | "enforcement_notice" | "guidance" | "compliance_bulletin" | "market_alert" | "technical_bulletin",
    summary: "",
    content: "",
    effectiveDate: "",
  });
  const { toast } = useToast();

  const { data: circulars, isLoading } = useQuery<RegulatoryCircular[]>({
    queryKey: ["/api/fwa/chi/circulars"],
  });
  
  const { data: providers } = useQuery<{ id: string; name: string; email?: string }[]>({
    queryKey: ["/api/provider-relations/directory"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newCircular) => {
      const response = await apiRequest("POST", "/api/fwa/chi/circulars", {
        ...data,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate).toISOString() : new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/chi/circulars"] });
      setCreateOpen(false);
      setNewCircular({ title: "", type: "guidance", summary: "", content: "", effectiveDate: "" });
      toast({ title: "Success", description: "Regulatory circular created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ circularId, sendToAllProviders, recipients }: { 
      circularId: string; 
      sendToAllProviders?: boolean;
      recipients?: { email: string; name?: string }[];
    }) => {
      const response = await apiRequest("POST", `/api/fwa/chi/circulars/${circularId}/send?token=seed-demo-2025`, {
        sendToAllProviders,
        recipients,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/chi/circulars"] });
      setSendEmailOpen(false);
      setEmailToSend(null);
      setCustomEmails("");
      toast({ 
        title: "Emails Sent", 
        description: `Successfully sent to ${data.sentCount} recipient(s)${data.failedCount > 0 ? `. ${data.failedCount} failed.` : ''}` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSendEmail = (circular: RegulatoryCircular) => {
    setEmailToSend(circular);
    setSendEmailOpen(true);
  };

  const handleConfirmSendEmail = () => {
    if (!emailToSend) return;
    
    if (sendToAll) {
      sendEmailMutation.mutate({ 
        circularId: emailToSend.id, 
        sendToAllProviders: true 
      });
    } else {
      const emails = customEmails
        .split(/[\n,;]/)
        .map(e => e.trim())
        .filter(e => e && e.includes("@"))
        .map(email => ({ email }));
      
      if (emails.length === 0) {
        toast({ title: "Error", description: "Please enter valid email addresses", variant: "destructive" });
        return;
      }
      
      sendEmailMutation.mutate({ 
        circularId: emailToSend.id, 
        recipients: emails 
      });
    }
  };

  const providersWithEmail = providers?.filter(p => p.email) || [];

  const circularList = circulars || [];

  const filteredCirculars = circularList.filter((c) => {
    const matchesSearch = c.circularNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: circularList.length,
    draft: circularList.filter(c => c.status === "draft").length,
    review: circularList.filter(c => c.status === "review").length,
    published: circularList.filter(c => c.status === "published").length,
    enforcement: circularList.filter(c => c.type === "enforcement_notice").length,
  };

  const handleViewCircular = (circular: RegulatoryCircular) => {
    setSelectedCircular(circular);
    setDetailOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Regulatory Communications</h1>
          <p className="text-muted-foreground">
            Central library of CHI communications and compliance updates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create">
            <Plus className="w-4 h-4 mr-2" />
            New Circular
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-total">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Circulars</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-draft">{stats.draft}</p>
            <p className="text-xs text-muted-foreground">Drafts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">{stats.review}</Badge>
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-review">{stats.review}</p>
            <p className="text-xs text-muted-foreground">Under Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-published">{stats.published}</p>
            <p className="text-xs text-muted-foreground">Published</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Mail className="w-5 h-5 text-red-600" />
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{stats.enforcement}</Badge>
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-enforcement">{stats.enforcement}</p>
            <p className="text-xs text-muted-foreground">Enforcement Notices</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Official Communications Management
          </CardTitle>
          <CardDescription>
            Draft, review, approve, and distribute regulatory circulars to providers and insurers. Track acknowledgment and compliance.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search circulars..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="superseded">Superseded</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="policy_update">Policy Update</SelectItem>
                <SelectItem value="enforcement_notice">Enforcement Notice</SelectItem>
                <SelectItem value="guidance">Guidance</SelectItem>
                <SelectItem value="compliance_bulletin">Compliance Bulletin</SelectItem>
                <SelectItem value="market_alert">Market Alert</SelectItem>
                <SelectItem value="technical_bulletin">Technical Bulletin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filteredCirculars.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No regulatory circulars found. Create circulars to communicate with providers.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Circular #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Acknowledgments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCirculars.map((circular) => (
                <TableRow key={circular.id} data-testid={`row-circular-${circular.id}`}>
                  <TableCell className="font-mono font-medium">{circular.circularNumber}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{circular.title}</TableCell>
                  <TableCell>
                    <Badge className={typeColors[circular.type] || ""}>
                      {circular.type.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {circular.effectiveDate ? new Date(circular.effectiveDate).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell>
                    {circular.publishedAt ? new Date(circular.publishedAt).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell>
                    {circular.totalRecipients && circular.totalRecipients > 0 ? (
                      <span className="text-sm">
                        {circular.acknowledgedCount || 0}/{circular.totalRecipients}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[circular.status || "draft"]}>{(circular.status || "draft").replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleViewCircular(circular)} data-testid={`button-view-circular-${circular.id}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {(circular.status === 'approved' || circular.status === 'published') && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleSendEmail(circular)}
                          title="Send to Providers"
                          data-testid={`button-send-circular-${circular.id}`}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          {selectedCircular && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {selectedCircular.circularNumber}
                </DialogTitle>
                <DialogDescription>
                  {selectedCircular.title}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge className={typeColors[selectedCircular.type]}>{selectedCircular.type.replace(/_/g, " ")}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={statusColors[selectedCircular.status || "draft"]}>{(selectedCircular.status || "draft").replace(/_/g, " ")}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Effective Date</p>
                    <p className="font-medium">
                      {selectedCircular.effectiveDate ? new Date(selectedCircular.effectiveDate).toLocaleDateString() : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Published</p>
                    <p className="font-medium">
                      {selectedCircular.publishedAt ? new Date(selectedCircular.publishedAt).toLocaleDateString() : "Not published"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Drafted By</p>
                    <p className="font-medium">{selectedCircular.draftedBy || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Approved By</p>
                    <p className="font-medium">{selectedCircular.approvedBy || "-"}</p>
                  </div>
                </div>
                {selectedCircular.summary && (
                  <div>
                    <p className="text-sm text-muted-foreground">Summary</p>
                    <p className="text-sm mt-1">{selectedCircular.summary}</p>
                  </div>
                )}
                {selectedCircular.targetAudience && selectedCircular.targetAudience.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Target Audience</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCircular.targetAudience.map((audience, idx) => (
                        <Badge key={idx} variant="outline">{audience}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedCircular.acknowledgmentRequired && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Acknowledgment Progress</p>
                        <p className="text-lg font-bold">
                          {selectedCircular.acknowledgedCount || 0} / {selectedCircular.totalRecipients || 0}
                        </p>
                      </div>
                      {selectedCircular.acknowledgmentDeadline && (
                        <div>
                          <p className="text-sm text-muted-foreground">Deadline</p>
                          <p className="font-medium">{new Date(selectedCircular.acknowledgmentDeadline).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDetailOpen(false)} data-testid="button-close-dialog">Close</Button>
                  {(selectedCircular.status === "approved" || selectedCircular.status === "published") && (
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setDetailOpen(false);
                        handleSendEmail(selectedCircular);
                      }}
                      data-testid="button-send-email"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Send to Providers
                    </Button>
                  )}
                  {selectedCircular.status === "approved" && (
                    <Button data-testid="button-publish">
                      <Send className="w-4 h-4 mr-2" />
                      Publish Circular
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Regulatory Circular</DialogTitle>
            <DialogDescription>
              Draft a new regulatory communication for distribution
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Circular Title *</Label>
              <Input
                id="title"
                placeholder="Updated Billing Guidelines for FY 2026"
                value={newCircular.title}
                onChange={(e) => setNewCircular({ ...newCircular, title: e.target.value })}
                data-testid="input-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Circular Type</Label>
                <Select
                  value={newCircular.type}
                  onValueChange={(value) => setNewCircular({ ...newCircular, type: value as typeof newCircular.type })}
                >
                  <SelectTrigger data-testid="select-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="policy_update">Policy Update</SelectItem>
                    <SelectItem value="enforcement_notice">Enforcement Notice</SelectItem>
                    <SelectItem value="guidance">Guidance</SelectItem>
                    <SelectItem value="compliance_bulletin">Compliance Bulletin</SelectItem>
                    <SelectItem value="market_alert">Market Alert</SelectItem>
                    <SelectItem value="technical_bulletin">Technical Bulletin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="effectiveDate">Effective Date</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={newCircular.effectiveDate}
                  onChange={(e) => setNewCircular({ ...newCircular, effectiveDate: e.target.value })}
                  data-testid="input-effective-date"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                placeholder="Brief summary of the circular..."
                value={newCircular.summary}
                onChange={(e) => setNewCircular({ ...newCircular, summary: e.target.value })}
                rows={2}
                data-testid="textarea-summary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Full Content *</Label>
              <Textarea
                id="content"
                placeholder="Complete circular content..."
                value={newCircular.content}
                onChange={(e) => setNewCircular({ ...newCircular, content: e.target.value })}
                rows={4}
                data-testid="textarea-content"
              />
            </div>
            {(!newCircular.title || !newCircular.content) && (
              <p className="text-sm text-destructive">Title and Content are required</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} data-testid="button-cancel-create">
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(newCircular)}
                disabled={createMutation.isPending || !newCircular.title.trim() || !newCircular.content.trim()}
                data-testid="button-submit-circular"
              >
                {createMutation.isPending ? "Creating..." : "Create Circular"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sendEmailOpen} onOpenChange={setSendEmailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Send to Providers
            </DialogTitle>
            <DialogDescription>
              {emailToSend && (
                <>Send <strong>{emailToSend.circularNumber}</strong> via email to healthcare providers</>
              )}
            </DialogDescription>
          </DialogHeader>
          {emailToSend && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{emailToSend.title}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Type: {emailToSend.type.replace(/_/g, " ")} | 
                  Effective: {emailToSend.effectiveDate ? new Date(emailToSend.effectiveDate).toLocaleDateString() : "N/A"}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="sendToAll" 
                    checked={sendToAll} 
                    onCheckedChange={(checked) => setSendToAll(checked === true)}
                    data-testid="checkbox-send-to-all"
                  />
                  <Label htmlFor="sendToAll" className="cursor-pointer">
                    Send to all providers with registered emails ({providersWithEmail.length} providers)
                  </Label>
                </div>

                {!sendToAll && (
                  <div className="space-y-2">
                    <Label htmlFor="customEmails">Custom Email Recipients</Label>
                    <Textarea
                      id="customEmails"
                      placeholder="Enter email addresses (one per line or separated by commas)"
                      value={customEmails}
                      onChange={(e) => setCustomEmails(e.target.value)}
                      rows={4}
                      data-testid="textarea-custom-emails"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter multiple emails separated by commas, semicolons, or new lines
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSendEmailOpen(false);
                    setEmailToSend(null);
                  }}
                  data-testid="button-cancel-send"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmSendEmail}
                  disabled={sendEmailMutation.isPending || (!sendToAll && !customEmails.trim())}
                  data-testid="button-confirm-send"
                >
                  {sendEmailMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Emails
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
