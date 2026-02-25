import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Search,
  Plus,
  ChevronRight,
  Filter,
  Mail,
  Phone,
  Calendar,
  FileText,
  MessageSquare,
  Send,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertProviderCommunicationSchema } from "@shared/schema";
import type { ProviderCommunication, ProviderDirectory } from "@shared/schema";
import { z } from "zod";

const communicationFormSchema = insertProviderCommunicationSchema.extend({
  providerId: z.string().min(1, "Provider is required"),
  providerName: z.string().min(1, "Provider name is required"),
  type: z.enum(["Email", "Phone", "Meeting", "Letter"], {
    required_error: "Type is required",
  }),
  direction: z.enum(["inbound", "outbound"]).default("outbound"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().optional(),
  status: z.enum(["Sent", "Received", "Pending"]).default("Pending"),
  outcome: z.enum(["Resolved", "Follow-up Needed", "Escalate"]).optional(),
  assignee: z.string().optional(),
  nextActionDate: z.string().optional(),
});

type CommunicationFormData = z.infer<typeof communicationFormSchema>;

export default function CommunicationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CommunicationFormData>({
    resolver: zodResolver(communicationFormSchema),
    defaultValues: {
      providerId: "",
      providerName: "",
      type: "Email",
      direction: "outbound",
      subject: "",
      body: "",
      status: "Pending",
      assignee: "",
      nextActionDate: "",
    },
  });

  const { data: communications = [], isLoading } = useQuery<ProviderCommunication[]>({
    queryKey: ["/api/provider-relations/communications"],
  });

  const { data: providers = [], isLoading: isLoadingProviders } = useQuery<ProviderDirectory[]>({
    queryKey: ["/api/provider-relations/providers"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: CommunicationFormData) => {
      const response = await apiRequest("POST", "/api/provider-relations/communications", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/communications"] });
      toast({
        title: "Communication Created",
        description: "The communication has been logged successfully.",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create communication",
        variant: "destructive",
      });
    },
  });

  const handleProviderChange = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    form.setValue("providerId", providerId);
    form.setValue("providerName", provider?.name || "");
  };

  const onSubmit = (data: CommunicationFormData) => {
    createMutation.mutate(data);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setDialogOpen(open);
  };

  const filteredLogs = communications.filter((log) => {
    const matchesSearch =
      log.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.assignee?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    const matchesType = typeFilter === "all" || log.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getCommunicationStatusBadge = (status: string) => {
    switch (status) {
      case "Sent":
        return (
          <Badge
            className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            data-testid={`badge-status-sent`}
          >
            Sent
          </Badge>
        );
      case "Received":
        return (
          <Badge
            className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            data-testid={`badge-status-received`}
          >
            Received
          </Badge>
        );
      case "Pending":
        return (
          <Badge
            className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            data-testid={`badge-status-pending`}
          >
            Pending
          </Badge>
        );
      default:
        return null;
    }
  };

  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case "Email":
        return <Mail className="h-4 w-4 text-blue-500" />;
      case "Phone":
        return <Phone className="h-4 w-4 text-green-500" />;
      case "Meeting":
        return <Calendar className="h-4 w-4 text-purple-500" />;
      case "Letter":
        return <FileText className="h-4 w-4 text-amber-500" />;
      default:
        return null;
    }
  };

  const sentCount = communications.filter((c) => c.status === "Sent").length;
  const receivedCount = communications.filter((c) => c.status === "Received").length;
  const pendingCount = communications.filter((c) => c.status === "Pending").length;

  const formatDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">
            Communication Log
          </h1>
          <p className="text-muted-foreground">
            Track all provider communications and follow-ups
          </p>
        </div>
        <Button
          size="sm"
          className="gap-2"
          data-testid="button-new-communication"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          New Communication
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Communications</p>
                <p className="text-2xl font-bold" data-testid="text-total-communications">
                  {communications.length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold" data-testid="text-sent-count">
                  {sentCount}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <Send className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Received</p>
                <p className="text-2xl font-bold" data-testid="text-received-count">
                  {receivedCount}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Follow-up</p>
                <p
                  className="text-2xl font-bold text-amber-600"
                  data-testid="text-pending-count"
                >
                  {pendingCount}
                </p>
              </div>
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <CardTitle>Communication Log</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search communications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
                data-testid="input-communication-search"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32" data-testid="select-type-filter">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Phone">Phone</SelectItem>
                <SelectItem value="Meeting">Meeting</SelectItem>
                <SelectItem value="Letter">Letter</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Received">Received</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No communications found. Click "New Communication" to add one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover-elevate"
                    data-testid={`row-communication-${log.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getCommunicationIcon(log.type)}
                        <span>{log.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{log.providerName}</TableCell>
                    <TableCell>{log.subject}</TableCell>
                    <TableCell>{log.assignee || "-"}</TableCell>
                    <TableCell>{formatDate(log.createdAt)}</TableCell>
                    <TableCell>{getCommunicationStatusBadge(log.status || "Pending")}</TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-lg" data-testid="dialog-new-communication">
          <DialogHeader>
            <DialogTitle>New Communication</DialogTitle>
            <DialogDescription>
              Log a new communication with a provider.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="providerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={handleProviderChange}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-provider">
                          <SelectValue placeholder={isLoadingProviders ? "Loading..." : "Select provider"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Email">Email</SelectItem>
                          <SelectItem value="Phone">Phone</SelectItem>
                          <SelectItem value="Meeting">Meeting</SelectItem>
                          <SelectItem value="Letter">Letter</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="direction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Direction</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-direction">
                            <SelectValue placeholder="Select direction" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="outbound">Outbound</SelectItem>
                          <SelectItem value="inbound">Inbound</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter subject"
                        data-testid="input-subject"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter communication details..."
                        rows={3}
                        data-testid="textarea-body"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Sent">Sent</SelectItem>
                          <SelectItem value="Received">Received</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="outcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outcome</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-outcome">
                            <SelectValue placeholder="Select outcome" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Resolved">Resolved</SelectItem>
                          <SelectItem value="Follow-up Needed">Follow-up Needed</SelectItem>
                          <SelectItem value="Escalate">Escalate</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assignee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter assignee name"
                          data-testid="input-assignee"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nextActionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Action Date</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          data-testid="input-next-action-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogClose(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-save-communication"
                >
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Communication
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
