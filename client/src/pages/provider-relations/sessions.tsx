import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  FileText,
  Package,
  CheckCircle,
  AlertCircle,
  Play,
  X,
  Building2,
  List,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { ReconciliationSession, ProviderDirectory, EvidencePack } from "@shared/schema";

type SessionStatus = "scheduled" | "in_progress" | "completed" | "cancelled" | "follow_up_required";

const sessionFormSchema = z.object({
  providerId: z.string().min(1, "Provider is required"),
  providerName: z.string().min(1, "Provider name is required"),
  scheduledDate: z.string().min(1, "Date is required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  meetingType: z.enum(["in_person", "virtual"]).default("virtual"),
  agenda: z.string().optional(),
});
type SessionFormData = z.infer<typeof sessionFormSchema>;

export default function SessionsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedSession, setSelectedSession] = useState<ReconciliationSession | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [newSessionDialogOpen, setNewSessionDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery<ReconciliationSession[]>({
    queryKey: ["/api/provider-relations/sessions"],
  });

  const { data: providers = [] } = useQuery<ProviderDirectory[]>({
    queryKey: ["/api/provider-relations/providers"],
  });

  const { data: evidencePacks = [] } = useQuery<EvidencePack[]>({
    queryKey: ["/api/provider-relations/evidence-packs"],
  });

  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      providerId: "",
      providerName: "",
      scheduledDate: "",
      startTime: "",
      endTime: "",
      location: "",
      meetingType: "virtual",
      agenda: "",
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: SessionFormData) => {
      const payload = {
        ...data,
        agenda: data.agenda ? data.agenda.split('\n').filter(Boolean) : [],
      };
      const response = await apiRequest("POST", "/api/provider-relations/sessions", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/sessions"] });
      toast({ title: "Success", description: "Session scheduled successfully" });
      setNewSessionDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to schedule session", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, minutes }: { id: string; status: string; minutes?: string }) => {
      const response = await apiRequest("PATCH", `/api/provider-relations/sessions/${id}/status`, { status, minutes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/sessions"] });
      toast({ title: "Success", description: "Session updated" });
      setIsDetailOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update session", variant: "destructive" });
    },
  });

  const handleFormSubmit = (data: SessionFormData) => {
    createSessionMutation.mutate(data);
  };

  const handleUpdateStatus = (session: ReconciliationSession, newStatus: string) => {
    updateStatusMutation.mutate({ id: session.id, status: newStatus });
  };

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      (session.sessionNumber?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (session.providerName?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || session.status === statusFilter;
    const matchesProvider = providerFilter === "all" || session.providerId === providerFilter;
    return matchesSearch && matchesStatus && matchesProvider;
  });

  const getStatusBadge = (status: SessionStatus | string | null) => {
    switch (status) {
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" data-testid="badge-status-scheduled">Scheduled</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" data-testid="badge-status-in-progress">In Progress</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" data-testid="badge-status-completed">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" data-testid="badge-status-cancelled">Cancelled</Badge>;
      case "follow_up_required":
        return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" data-testid="badge-status-followup">Follow-up Required</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: SessionStatus | string | null) => {
    switch (status) {
      case "scheduled":
        return <CalendarIcon className="h-4 w-4 text-blue-600" />;
      case "in_progress":
        return <Play className="h-4 w-4 text-amber-600" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "cancelled":
        return <X className="h-4 w-4 text-gray-500" />;
      case "follow_up_required":
        return <AlertCircle className="h-4 w-4 text-purple-600" />;
      default:
        return null;
    }
  };

  const sessionsOnDate = (date: Date) => {
    return sessions.filter((s) => {
      const sessionDate = s.scheduledDate ? new Date(s.scheduledDate) : null;
      return sessionDate && format(sessionDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
    });
  };

  const totalSessions = sessions.length;
  const scheduledCount = sessions.filter((s) => s.status === "scheduled").length;
  const inProgressCount = sessions.filter((s) => s.status === "in_progress").length;
  const completedCount = sessions.filter((s) => s.status === "completed").length;
  const followUpCount = sessions.filter((s) => s.status === "follow_up_required").length;

  const parseAttendees = (attendees: unknown): Array<{ name: string; role: string; organization: string; email?: string }> => {
    if (Array.isArray(attendees)) {
      return attendees as Array<{ name: string; role: string; organization: string; email?: string }>;
    }
    return [];
  };

  const parseAgenda = (agenda: unknown): string[] => {
    if (Array.isArray(agenda)) {
      return agenda as string[];
    }
    return [];
  };

  const parseOutcomes = (outcomes: unknown): Array<{ category: string; proposedAmount: number; agreedAmount: number; status: string; notes?: string }> => {
    if (Array.isArray(outcomes)) {
      return outcomes as Array<{ category: string; proposedAmount: number; agreedAmount: number; status: string; notes?: string }>;
    }
    return [];
  };

  const parseActionItems = (items: unknown): Array<{ description: string; assignee: string; dueDate: string; status: string }> => {
    if (Array.isArray(items)) {
      return items as Array<{ description: string; assignee: string; dueDate: string; status: string }>;
    }
    return [];
  };

  const parseEvidencePackIds = (ids: unknown): string[] => {
    if (Array.isArray(ids)) {
      return ids as string[];
    }
    return [];
  };

  if (isLoadingSessions) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="loading-sessions">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Reconciliation Sessions</h1>
          <p className="text-muted-foreground">
            Schedule and manage negotiation meetings with providers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "calendar" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              data-testid="button-view-calendar"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Dialog open={newSessionDialogOpen} onOpenChange={setNewSessionDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-schedule-session">
                <Plus className="h-4 w-4" />
                Schedule Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Schedule Reconciliation Session</DialogTitle>
                <DialogDescription>
                  Schedule a new negotiation meeting with a provider.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="providerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provider</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              const provider = providers.find((p) => p.id === value);
                              if (provider) {
                                form.setValue("providerName", provider.name);
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-session-provider">
                                <SelectValue placeholder="Select provider..." />
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
                    <FormField
                      control={form.control}
                      name="meetingType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meeting Type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-meeting-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="in_person">In Person</SelectItem>
                              <SelectItem value="virtual">Virtual</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              data-testid="input-session-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              data-testid="input-start-time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              data-testid="input-end-time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Conference Room A, or Virtual - Microsoft Teams"
                            {...field}
                            data-testid="input-location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="agenda"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agenda Items (one per line)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter agenda items, one per line..."
                            className="min-h-[100px]"
                            {...field}
                            data-testid="input-agenda"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNewSessionDialogOpen(false)}
                      data-testid="button-cancel-create"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createSessionMutation.isPending}
                      data-testid="button-confirm-create"
                    >
                      {createSessionMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Schedule Session
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold" data-testid="text-total-sessions">{totalSessions}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-scheduled-count">{scheduledCount}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-amber-600" data-testid="text-in-progress-count">{inProgressCount}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Play className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-completed-count">{completedCount}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Follow-up</p>
                <p className="text-2xl font-bold text-purple-600" data-testid="text-followup-count">{followUpCount}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <AlertCircle className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {viewMode === "calendar" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                modifiers={{
                  hasSession: sessions.map((s) => s.scheduledDate ? new Date(s.scheduledDate) : new Date()),
                }}
                modifiersStyles={{
                  hasSession: { backgroundColor: "hsl(var(--primary) / 0.1)", fontWeight: "bold" },
                }}
                data-testid="calendar-sessions"
              />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                Sessions on {selectedDate ? format(selectedDate, "PPP") : "Selected Date"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDate && sessionsOnDate(selectedDate).length > 0 ? (
                <div className="space-y-3">
                  {sessionsOnDate(selectedDate).map((session) => (
                    <div
                      key={session.id}
                      className="p-4 border rounded-lg hover-elevate cursor-pointer"
                      onClick={() => {
                        setSelectedSession(session);
                        setIsDetailOpen(true);
                      }}
                      data-testid={`card-session-${session.sessionNumber}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(session.status)}
                          <span className="font-medium">{session.sessionNumber}</span>
                        </div>
                        {getStatusBadge(session.status)}
                      </div>
                      <p className="text-sm font-medium">{session.providerName}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {session.startTime} - {session.endTime || "TBD"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.location || "TBD"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No sessions scheduled for this date.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === "list" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle>Session List</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                  data-testid="input-session-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="follow_up_required">Follow-up Required</SelectItem>
                </SelectContent>
              </Select>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-48" data-testid="select-provider-filter">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-center">Attendees</TableHead>
                  <TableHead className="text-right">Proposed</TableHead>
                  <TableHead className="text-right">Negotiated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSessions.map((session) => (
                  <TableRow
                    key={session.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => {
                      setSelectedSession(session);
                      setIsDetailOpen(true);
                    }}
                    data-testid={`row-session-${session.sessionNumber}`}
                  >
                    <TableCell className="font-medium">{session.sessionNumber}</TableCell>
                    <TableCell>{session.providerName}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {session.scheduledDate ? format(new Date(session.scheduledDate), "MMM dd, yyyy") : "-"}
                        <div className="text-muted-foreground text-xs">
                          {session.startTime} - {session.endTime || "TBD"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">{session.location || "-"}</TableCell>
                    <TableCell className="text-center">{parseAttendees(session.attendees).length}</TableCell>
                    <TableCell className="text-right">
                      {session.proposedAmount ? `$${parseFloat(session.proposedAmount).toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {session.negotiatedAmount ? (
                        <span className="text-green-600 font-medium">
                          ${parseFloat(session.negotiatedAmount).toLocaleString()}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No sessions found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedSession && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <DialogTitle className="text-xl">{selectedSession.sessionNumber}</DialogTitle>
                    <DialogDescription className="mt-1">
                      {selectedSession.providerName}
                    </DialogDescription>
                  </div>
                  {getStatusBadge(selectedSession.status)}
                </div>
              </DialogHeader>

              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                  <TabsTrigger value="outcomes" data-testid="tab-outcomes">Outcomes</TabsTrigger>
                  <TabsTrigger value="actions" data-testid="tab-actions">Action Items</TabsTrigger>
                  <TabsTrigger value="minutes" data-testid="tab-minutes">Minutes</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Date & Time</label>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span data-testid="text-session-datetime">
                          {selectedSession.scheduledDate ? format(new Date(selectedSession.scheduledDate), "PPP") : "-"} | {selectedSession.startTime} - {selectedSession.endTime || "TBD"}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-muted-foreground">Location</label>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span data-testid="text-session-location">{selectedSession.location || "Not specified"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Attendees ({parseAttendees(selectedSession.attendees).length})
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {parseAttendees(selectedSession.attendees).map((attendee, index) => (
                        <div key={index} className="p-3 border rounded-md" data-testid={`attendee-${index}`}>
                          <p className="font-medium">{attendee.name}</p>
                          <p className="text-sm text-muted-foreground">{attendee.role}</p>
                          <p className="text-xs text-muted-foreground">{attendee.organization}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Agenda
                    </label>
                    <div className="space-y-1">
                      {parseAgenda(selectedSession.agenda).map((item, index) => (
                        <div key={index} className="flex items-start gap-2 p-2 bg-muted rounded-md">
                          <span className="text-sm text-muted-foreground">{index + 1}.</span>
                          <span className="text-sm" data-testid={`agenda-item-${index}`}>{item}</span>
                        </div>
                      ))}
                      {parseAgenda(selectedSession.agenda).length === 0 && (
                        <p className="text-sm text-muted-foreground">No agenda items set.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Evidence Packs
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {parseEvidencePackIds(selectedSession.evidencePackIds).map((packId) => (
                        <Link key={packId} href="/provider-relations/evidence-packs">
                          <Badge variant="outline" className="cursor-pointer hover-elevate" data-testid={`link-pack-${packId}`}>
                            {packId}
                          </Badge>
                        </Link>
                      ))}
                      {parseEvidencePackIds(selectedSession.evidencePackIds).length === 0 && (
                        <p className="text-sm text-muted-foreground">No evidence packs linked.</p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="outcomes" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Proposed Amount</p>
                        <p className="text-2xl font-bold" data-testid="text-proposed-amount">
                          {selectedSession.proposedAmount
                            ? `$${parseFloat(selectedSession.proposedAmount).toLocaleString()}`
                            : "-"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Negotiated Amount</p>
                        <p className="text-2xl font-bold text-green-600" data-testid="text-negotiated-amount">
                          {selectedSession.negotiatedAmount
                            ? `$${parseFloat(selectedSession.negotiatedAmount).toLocaleString()}`
                            : "-"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {parseOutcomes(selectedSession.outcomes).length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Proposed</TableHead>
                          <TableHead className="text-right">Agreed</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parseOutcomes(selectedSession.outcomes).map((outcome, index) => (
                          <TableRow key={index} data-testid={`outcome-row-${index}`}>
                            <TableCell className="font-medium">{outcome.category}</TableCell>
                            <TableCell className="text-right">${outcome.proposedAmount.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-green-600">
                              ${outcome.agreedAmount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  outcome.status === "agreed"
                                    ? "bg-green-100 text-green-700"
                                    : outcome.status === "disputed"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                                }
                              >
                                {outcome.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                              {outcome.notes || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No outcomes recorded yet.
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="actions" className="space-y-4 mt-4">
                  {parseActionItems(selectedSession.actionItems).length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Assignee</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parseActionItems(selectedSession.actionItems).map((item, index) => (
                          <TableRow key={index} data-testid={`action-row-${index}`}>
                            <TableCell className="max-w-[300px]">{item.description}</TableCell>
                            <TableCell>{item.assignee}</TableCell>
                            <TableCell>{item.dueDate}</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  item.status === "completed"
                                    ? "bg-green-100 text-green-700"
                                    : item.status === "in_progress"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-700"
                                }
                              >
                                {item.status.replace("_", " ")}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No action items recorded yet.
                    </div>
                  )}

                  {selectedSession.followUpDate && (
                    <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                      <AlertCircle className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">
                        Follow-up scheduled: {format(new Date(selectedSession.followUpDate), "PPP")}
                      </span>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="minutes" className="mt-4">
                  {selectedSession.minutes ? (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap" data-testid="text-session-minutes">
                        {selectedSession.minutes}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No minutes recorded yet.
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6 flex-wrap gap-2">
                {selectedSession.status === "scheduled" && (
                  <Button
                    onClick={() => handleUpdateStatus(selectedSession, "in_progress")}
                    className="gap-2"
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-start-session"
                  >
                    {updateStatusMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Start Session
                  </Button>
                )}
                {selectedSession.status === "in_progress" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateStatus(selectedSession, "follow_up_required")}
                      disabled={updateStatusMutation.isPending}
                      data-testid="button-require-followup"
                    >
                      {updateStatusMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <AlertCircle className="h-4 w-4 mr-2" />
                      )}
                      Require Follow-up
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatus(selectedSession, "completed")}
                      className="gap-2"
                      disabled={updateStatusMutation.isPending}
                      data-testid="button-complete-session"
                    >
                      {updateStatusMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Complete Session
                    </Button>
                  </>
                )}
                {selectedSession.status === "follow_up_required" && (
                  <Button
                    onClick={() => handleUpdateStatus(selectedSession, "completed")}
                    className="gap-2"
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-mark-complete"
                  >
                    {updateStatusMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Mark as Completed
                  </Button>
                )}
                <Button variant="outline" onClick={() => setIsDetailOpen(false)} data-testid="button-close-detail">
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
