import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  Search,
  Plus,
  ChevronRight,
  Filter,
  FileCheck,
  Calendar,
  DollarSign,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertProviderContractSchema } from "@shared/schema";
import type { ProviderContract, ProviderDirectory } from "@shared/schema";
import { z } from "zod";

const CONTRACT_TYPES = ["Premium Network", "Standard Network", "VIP Network", "Custom"] as const;

const contractFormSchema = insertProviderContractSchema.extend({
  contractNumber: z.string().optional(),
  providerId: z.string().min(1, "Provider is required"),
  providerName: z.string().min(1, "Provider name is required"),
  contractType: z.enum(CONTRACT_TYPES, {
    required_error: "Contract type is required",
  }),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  value: z.string().optional(),
  feeSchedule: z.string().optional(),
  autoRenewal: z.boolean().default(false),
  notes: z.string().optional(),
});

type ContractFormData = z.infer<typeof contractFormSchema>;

function generateContractNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `CON-${year}${month}-${random}`;
}

export default function ContractsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      providerId: "",
      providerName: "",
      contractType: "Standard Network",
      startDate: "",
      endDate: "",
      value: "",
      feeSchedule: "",
      autoRenewal: false,
      notes: "",
    },
  });

  const { data: contracts = [], isLoading } = useQuery<ProviderContract[]>({
    queryKey: ["/api/provider-relations/contracts"],
  });

  const { data: providers = [], isLoading: isLoadingProviders } = useQuery<ProviderDirectory[]>({
    queryKey: ["/api/provider-relations/providers"],
  });

  const createContractMutation = useMutation({
    mutationFn: async (data: ContractFormData) => {
      const payload = {
        ...data,
        contractNumber: generateContractNumber(),
      };
      const response = await apiRequest("POST", "/api/provider-relations/contracts", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/contracts"] });
      toast({
        title: "Contract Created",
        description: "The new contract has been created successfully.",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create contract",
        variant: "destructive",
      });
    },
  });

  const handleProviderChange = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    form.setValue("providerId", providerId);
    form.setValue("providerName", provider?.name || "");
  };

  const onSubmit = (data: ContractFormData) => {
    createContractMutation.mutate(data);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setDialogOpen(open);
  };

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.contractType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getContractStatusBadge = (status: string | null) => {
    switch (status) {
      case "Active":
        return (
          <Badge
            className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            data-testid="badge-status-active"
          >
            Active
          </Badge>
        );
      case "Pending Renewal":
        return (
          <Badge
            className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            data-testid="badge-status-pending"
          >
            Pending Renewal
          </Badge>
        );
      case "Expired":
        return (
          <Badge
            className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            data-testid="badge-status-expired"
          >
            Expired
          </Badge>
        );
      case "Draft":
        return (
          <Badge
            className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
            data-testid="badge-status-draft"
          >
            Draft
          </Badge>
        );
      case "Terminated":
        return (
          <Badge
            className="bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300"
            data-testid="badge-status-terminated"
          >
            Terminated
          </Badge>
        );
      default:
        return null;
    }
  };

  const totalValue = contracts.reduce((sum, c) => sum + parseFloat(c.value || "0"), 0);
  const activeCount = contracts.filter((c) => c.status === "Active").length;
  const pendingCount = contracts.filter((c) => c.status === "Pending Renewal").length;
  const expiredCount = contracts.filter((c) => c.status === "Expired").length;

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  };

  const formatValue = (value: string | null) => {
    if (!value) return "-";
    const num = parseFloat(value);
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    }
    return `$${num.toLocaleString()}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">
            Contract Management
          </h1>
          <p className="text-muted-foreground">Manage provider contracts, renewals, and agreements</p>
        </div>
        <Button
          size="sm"
          className="gap-2"
          data-testid="button-new-contract"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          New Contract
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Contracts</p>
                <p className="text-2xl font-bold" data-testid="text-total-contracts">
                  {contracts.length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold" data-testid="text-total-value">
                  {formatValue(String(totalValue))}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Renewal</p>
                <p className="text-2xl font-bold text-amber-600" data-testid="text-pending-count">
                  {pendingCount}
                </p>
              </div>
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold text-red-600" data-testid="text-expired-count">
                  {expiredCount}
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <Calendar className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <CardTitle>Contract Management</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contracts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
                data-testid="input-contract-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending Renewal">Pending Renewal</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
                <SelectItem value="Terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {contracts.length === 0
                ? "No contracts found. Click 'New Contract' to create one."
                : "No contracts match your search criteria."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract ID</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => (
                  <TableRow
                    key={contract.id}
                    className="cursor-pointer hover-elevate"
                    data-testid={`row-contract-${contract.contractNumber}`}
                  >
                    <TableCell className="font-medium">{contract.contractNumber}</TableCell>
                    <TableCell>{contract.providerName}</TableCell>
                    <TableCell>{contract.contractType}</TableCell>
                    <TableCell>{formatDate(contract.startDate)}</TableCell>
                    <TableCell>{formatDate(contract.endDate)}</TableCell>
                    <TableCell className="text-right">{formatValue(contract.value)}</TableCell>
                    <TableCell>{getContractStatusBadge(contract.status)}</TableCell>
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
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-new-contract">
          <DialogHeader>
            <DialogTitle>New Contract</DialogTitle>
            <DialogDescription>Create a new provider contract. All fields marked with * are required.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="providerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider *</FormLabel>
                    <Select value={field.value} onValueChange={handleProviderChange}>
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

              <FormField
                control={form.control}
                name="contractType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Type *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-contract-type">
                          <SelectValue placeholder="Select contract type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONTRACT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
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
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          data-testid="input-start-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          data-testid="input-end-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Value ($)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="e.g., 1000000"
                        data-testid="input-contract-value"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="feeSchedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee Schedule</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Standard Fee Schedule 2025"
                        data-testid="input-fee-schedule"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="autoRenewal"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Auto Renewal</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-auto-renewal"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Additional notes about the contract..."
                        rows={3}
                        data-testid="textarea-notes"
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
                  onClick={() => handleDialogClose(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createContractMutation.isPending}
                  data-testid="button-save-contract"
                >
                  {createContractMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Contract"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
