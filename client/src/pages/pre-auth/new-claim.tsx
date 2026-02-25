import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { Link } from "wouter";
import type { InsertPreAuthClaim } from "@shared/schema";

const diagnosisSchema = z.object({
  code: z.string().min(1, "Code is required"),
  desc: z.string().optional(),
  codeSystem: z.enum(["ICD-10", "ICD-9"]),
});

const lineItemSchema = z.object({
  id: z.string(),
  code: z.string().min(1, "Code is required"),
  desc: z.string().optional(),
  codeType: z.enum(["CPT", "HCPCS", "NDC"]),
  units: z.coerce.number().min(1, "Must be at least 1"),
  unitPrice: z.coerce.number().min(0, "Must be 0 or greater"),
});

const preAuthFormSchema = z.object({
  claimId: z.string().min(1, "Request ID is required"),
  payerId: z.string().min(1, "Payer ID is required"),
  priority: z.enum(["HIGH", "NORMAL", "LOW"]),
  memberId: z.string().min(1, "Member ID is required"),
  memberDob: z.string().optional(),
  memberGender: z.enum(["M", "F", ""]).optional(),
  policyPlanId: z.string().optional(),
  providerId: z.string().optional(),
  specialty: z.string().optional(),
  networkStatus: z.enum(["InNetwork", "OutOfNetwork"]),
  encounterType: z.enum(["Outpatient", "Inpatient", "Emergency", ""]).optional(),
  diagnoses: z.array(diagnosisSchema).min(1, "At least one diagnosis is required"),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  notes: z.string().optional(),
});

type PreAuthFormValues = z.infer<typeof preAuthFormSchema>;

export default function NewPreAuthClaim() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<PreAuthFormValues>({
    resolver: zodResolver(preAuthFormSchema),
    defaultValues: {
      claimId: `PA-${Date.now().toString(36).toUpperCase()}`,
      payerId: "",
      priority: "NORMAL",
      memberId: "",
      memberDob: "",
      memberGender: "",
      policyPlanId: "",
      providerId: "",
      specialty: "",
      networkStatus: "InNetwork",
      encounterType: "",
      diagnoses: [{ code: "", desc: "", codeSystem: "ICD-10" }],
      lineItems: [{ id: `LI-${Date.now().toString(36)}`, code: "", desc: "", codeType: "CPT", units: 1, unitPrice: 0 }],
      notes: "",
    },
  });

  const { fields: diagnosisFields, append: appendDiagnosis, remove: removeDiagnosis } = useFieldArray({
    control: form.control,
    name: "diagnoses",
  });

  const { fields: lineItemFields, append: appendLineItem, remove: removeLineItem } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const lineItems = form.watch("lineItems");
  const totalAmount = lineItems.reduce((sum, item) => sum + (item.units || 0) * (item.unitPrice || 0), 0);

  const createMutation = useMutation({
    mutationFn: async (data: Partial<InsertPreAuthClaim>) => {
      const res = await apiRequest("POST", "/api/pre-auth/claims", data);
      const claim = await res.json();
      await apiRequest("POST", `/api/pre-auth/claims/${claim.id}/process`);
      return claim;
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pre-auth/claims"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pre-auth/stats"] });
      toast({
        title: "Pre-auth request submitted",
        description: "Your request is now being processed through all adjudication phases",
      });
      navigate(`/pre-auth/claims/${result.id}`);
    },
    onError: () => {
      toast({
        title: "Submission failed",
        description: "There was an error submitting your pre-auth request",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: PreAuthFormValues) => {
    const claimData: Partial<InsertPreAuthClaim> = {
      claimId: values.claimId,
      payerId: values.payerId,
      memberId: values.memberId,
      memberDob: values.memberDob || undefined,
      memberGender: values.memberGender || undefined,
      policyPlanId: values.policyPlanId || undefined,
      providerId: values.providerId || undefined,
      specialty: values.specialty || undefined,
      networkStatus: values.networkStatus || undefined,
      encounterType: values.encounterType || undefined,
      totalAmount: totalAmount.toString(),
      priority: values.priority,
      diagnoses: values.diagnoses
        .filter((d) => d.code)
        .map((d) => ({
          code_system: d.codeSystem,
          code: d.code,
          desc: d.desc || "",
        })),
      lineItems: values.lineItems
        .filter((item) => item.code)
        .map((item) => ({
          line_id: item.id,
          code_type: item.codeType,
          code: item.code,
          desc: item.desc || "",
          units: item.units,
          net_amount: item.units * item.unitPrice,
        })),
      clinicalDocuments: values.notes
        ? [{ doc_id: "DOC-NOTES", type: "NOTE", mime: "text/plain", text: values.notes }]
        : [],
    };

    createMutation.mutate(claimData);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild data-testid="button-back">
          <Link href="/pre-auth/claims">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">New Pre-Authorization Request</h1>
          <p className="text-muted-foreground">
            Enter request details for pre-authorization processing
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="claimId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Request ID</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-claim-id" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payer ID *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., PAYER-001" data-testid="input-payer-id" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-priority">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="NORMAL">Normal</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Member Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="memberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Member ID *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., MEM-12345" data-testid="input-member-id" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="memberDob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-member-dob" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="memberGender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-member-gender">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="policyPlanId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy Plan ID</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., POL-001" data-testid="input-policy-plan-id" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Provider Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="providerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider ID</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., PROV-001" data-testid="input-provider-id" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialty</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Cardiology" data-testid="input-specialty" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="networkStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Network Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-network-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="InNetwork">In Network</SelectItem>
                        <SelectItem value="OutOfNetwork">Out of Network</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="encounterType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Encounter Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-encounter-type">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Outpatient">Outpatient</SelectItem>
                        <SelectItem value="Inpatient">Inpatient</SelectItem>
                        <SelectItem value="Emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Diagnoses</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendDiagnosis({ code: "", desc: "", codeSystem: "ICD-10" })}
                data-testid="button-add-diagnosis"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {diagnosisFields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <FormField
                    control={form.control}
                    name={`diagnoses.${idx}.codeSystem`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code System</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid={`select-diagnosis-system-${idx}`}>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ICD-10">ICD-10</SelectItem>
                            <SelectItem value="ICD-9">ICD-9</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`diagnoses.${idx}.code`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., J06.9" data-testid={`input-diagnosis-code-${idx}`} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`diagnoses.${idx}.desc`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Acute upper respiratory infection" data-testid={`input-diagnosis-desc-${idx}`} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDiagnosis(idx)}
                    disabled={diagnosisFields.length === 1}
                    data-testid={`button-remove-diagnosis-${idx}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Line Items / Procedures</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendLineItem({ id: `LI-${Date.now().toString(36)}`, code: "", desc: "", codeType: "CPT", units: 1, unitPrice: 0 })}
                data-testid="button-add-line-item"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {lineItemFields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                  <FormField
                    control={form.control}
                    name={`lineItems.${idx}.codeType`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid={`select-line-item-type-${idx}`}>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CPT">CPT</SelectItem>
                            <SelectItem value="HCPCS">HCPCS</SelectItem>
                            <SelectItem value="NDC">NDC</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`lineItems.${idx}.code`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 99213" data-testid={`input-line-item-code-${idx}`} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`lineItems.${idx}.desc`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Office visit" data-testid={`input-line-item-desc-${idx}`} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`lineItems.${idx}.units`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Units</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} data-testid={`input-line-item-units-${idx}`} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`lineItems.${idx}.unitPrice`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Price</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" {...field} data-testid={`input-line-item-price-${idx}`} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(idx)}
                    disabled={lineItemFields.length === 1}
                    data-testid={`button-remove-line-item-${idx}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <Badge variant="secondary" className="text-base">
                  ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clinical Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter any clinical notes or supporting information..."
                        className="min-h-[100px]"
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" asChild data-testid="button-cancel">
              <Link href="/pre-auth/claims">Cancel</Link>
            </Button>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Pre-Auth Request
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
