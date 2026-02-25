import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Sparkles, 
  X, 
  Building2, 
  Phone, 
  Users, 
  FileText, 
  FileBarChart, 
  Brain, 
  Check,
  Loader2,
  Download,
  AlertTriangle
} from "lucide-react";
import { generateFullExportReport, generatePrintSummary, ClaimData, ProviderData } from "@/lib/report-generator";

interface Provider {
  id: string;
  providerId?: string;
  name?: string;
  providerName?: string;
  specialty?: string;
  hospital?: string;
  hospitalName?: string;
  groupNumber?: string;
  contactNumber?: string;
  totalClaimedAmount?: number;
  outlierClaimsCount?: number;
  aiScore?: number;
}

interface ProviderGroup {
  groupNumber: string;
  groupName: string;
  groupType: string;
  memberCount: number;
}

interface Claim {
  id: string;
  providerId: string;
  amount: number;
}

interface AgenticWorkflowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WorkflowStep = "select" | "processing" | "complete";
type ProcessingStage = "export" | "summary" | "llm" | "done";

interface SelectedProvider {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  groupNumber: string | null;
  contactNumber: string;
}

export function AgenticWorkflowModal({ open, onOpenChange }: AgenticWorkflowModalProps) {
  const [step, setStep] = useState<WorkflowStep>("select");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"all" | "name" | "id" | "group" | "contact">("all");
  const [selectedProviders, setSelectedProviders] = useState<SelectedProvider[]>([]);
  const [includeLLMGeneration, setIncludeLLMGeneration] = useState(false);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>("export");
  const [progress, setProgress] = useState(0);
  const [generatedReport, setGeneratedReport] = useState<string>("");
  const [generatedSummary, setGeneratedSummary] = useState<string>("");
  const [generatedLetter, setGeneratedLetter] = useState<string>("");
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);

  const { data: providersData, isLoading: isLoadingProviders } = useQuery<Provider[]>({
    queryKey: ["/api/demo/providers"],
    enabled: open,
  });

  const { data: claimsData, isLoading: isLoadingClaims } = useQuery<Claim[]>({
    queryKey: ["/api/demo/claims"],
    enabled: open,
  });

  const providers = providersData || [];
  const claims = claimsData || [];

  const providerGroups = useMemo((): ProviderGroup[] => {
    const groupMap = new Map<string, { count: number; name: string }>();
    providers.forEach((provider) => {
      const groupNumber = provider.groupNumber;
      if (groupNumber) {
        const existing = groupMap.get(groupNumber);
        if (existing) {
          existing.count++;
        } else {
          groupMap.set(groupNumber, { count: 1, name: groupNumber });
        }
      }
    });
    return Array.from(groupMap.entries()).map(([groupNumber, data]) => ({
      groupNumber,
      groupName: data.name,
      groupType: "provider_group",
      memberCount: data.count,
    }));
  }, [providers]);

  const filteredProviders = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return providers.filter((provider) => {
      const name = (provider.name || provider.providerName || "").toLowerCase();
      const id = (provider.id || provider.providerId || "").toLowerCase();
      const hospital = (provider.hospital || provider.hospitalName || "").toLowerCase();
      const groupNumber = (provider.groupNumber || "").toLowerCase();
      const contactNumber = provider.contactNumber || "";
      
      switch (searchType) {
        case "name":
          return name.includes(query);
        case "id":
          return id.includes(query);
        case "group":
          return groupNumber.includes(query);
        case "contact":
          return contactNumber.includes(query);
        default:
          return (
            name.includes(query) ||
            id.includes(query) ||
            groupNumber.includes(query) ||
            contactNumber.includes(query) ||
            hospital.includes(query)
          );
      }
    });
  }, [searchQuery, searchType, providers]);

  const groupedProviders = useMemo(() => {
    const groups: Record<string, Provider[]> = {};
    providers.forEach((provider) => {
      if (provider.groupNumber) {
        if (!groups[provider.groupNumber]) {
          groups[provider.groupNumber] = [];
        }
        groups[provider.groupNumber].push(provider);
      }
    });
    return groups;
  }, [providers]);

  const handleProviderSelect = (provider: Provider) => {
    const providerId = provider.id || provider.providerId || "";
    const exists = selectedProviders.find((p) => p.id === providerId);
    if (exists) {
      setSelectedProviders(selectedProviders.filter((p) => p.id !== providerId));
    } else {
      setSelectedProviders([
        ...selectedProviders,
        {
          id: providerId,
          name: provider.name || provider.providerName || "",
          specialty: provider.specialty || "",
          hospital: provider.hospital || provider.hospitalName || "",
          groupNumber: provider.groupNumber || null,
          contactNumber: provider.contactNumber || "",
        },
      ]);
    }
  };

  const handleGroupSelect = (groupNumber: string) => {
    const groupProviders = groupedProviders[groupNumber] || [];
    const allSelected = groupProviders.every((p) =>
      selectedProviders.some((sp) => sp.id === (p.id || p.providerId))
    );

    if (allSelected) {
      setSelectedProviders(
        selectedProviders.filter((sp) => !groupProviders.some((gp) => (gp.id || gp.providerId) === sp.id))
      );
    } else {
      const newProviders = groupProviders
        .filter((p) => !selectedProviders.some((sp) => sp.id === (p.id || p.providerId)))
        .map((p) => ({
          id: p.id || p.providerId || "",
          name: p.name || p.providerName || "",
          specialty: p.specialty || "",
          hospital: p.hospital || p.hospitalName || "",
          groupNumber: p.groupNumber || null,
          contactNumber: p.contactNumber || "",
        }));
      setSelectedProviders([...selectedProviders, ...newProviders]);
    }
  };

  const removeProvider = (providerId: string) => {
    setSelectedProviders(selectedProviders.filter((p) => p.id !== providerId));
  };

  const startWorkflow = async () => {
    if (selectedProviders.length === 0) return;
    
    setStep("processing");
    setProcessingStage("export");
    setProgress(0);

    const providerIds = selectedProviders.map((p) => p.id);
    const relevantClaims = claims.filter((c) => providerIds.includes(c.providerId));
    const claimIds = relevantClaims.map((c) => c.id);

    for (let i = 0; i <= 30; i++) {
      await new Promise((r) => setTimeout(r, 50));
      setProgress(i);
    }

    const getProviderMetrics = (providerId: string) => {
      const provider = providers.find((mp) => (mp.id || mp.providerId) === providerId);
      return {
        totalClaimedAmount: provider?.totalClaimedAmount || 0,
        outlierClaimsCount: provider?.outlierClaimsCount || 0,
        aiScore: provider?.aiScore || 0,
      };
    };

    const claimsForReport: ClaimData[] = claims.map(c => ({
      id: c.id,
      claimNumber: c.id,
      patientName: "Patient",
      patientGender: "Unknown",
      patientAge: 0,
      providerName: "Provider",
      registrationDate: new Date().toISOString().split("T")[0],
      amount: c.amount,
      outlierScore: 0,
      icdDescription: "",
      claimType: "Outpatient",
      lengthOfStay: 1,
    }));
    
    const providersForReport: ProviderData[] = selectedProviders.map((p) => ({
      id: p.id,
      name: p.name,
      specialty: p.specialty,
      hospital: p.hospital,
      aiScore: getProviderMetrics(p.id).aiScore,
      totalClaimedAmount: getProviderMetrics(p.id).totalClaimedAmount,
      outlierClaimsCount: getProviderMetrics(p.id).outlierClaimsCount,
    }));
    
    const exportReport = generateFullExportReport(
      claimIds,
      providersForReport,
      [],
      claimsForReport
    );
    setGeneratedReport(exportReport);

    setProcessingStage("summary");
    for (let i = 30; i <= 60; i++) {
      await new Promise((r) => setTimeout(r, 40));
      setProgress(i);
    }

    const summaryReport = generatePrintSummary(
      claimIds,
      providersForReport,
      [],
      claimsForReport
    );
    setGeneratedSummary(summaryReport);

    if (includeLLMGeneration) {
      setProcessingStage("llm");
      setIsGeneratingLetter(true);
      for (let i = 60; i <= 85; i++) {
        await new Promise((r) => setTimeout(r, 80));
        setProgress(i);
      }

      try {
        const response = await fetch("/api/generate-letter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providers: selectedProviders,
            summary: summaryReport,
            claimCount: relevantClaims.length,
            totalAmount: relevantClaims.reduce((sum, c) => sum + c.amount, 0),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setGeneratedLetter(data.letter);
        } else {
          setGeneratedLetter("Error generating letter. Please try again.");
        }
      } catch {
        setGeneratedLetter("Error connecting to AI service. Please try again later.");
      }
      setIsGeneratingLetter(false);

      for (let i = 85; i <= 100; i++) {
        await new Promise((r) => setTimeout(r, 30));
        setProgress(i);
      }
    } else {
      for (let i = 60; i <= 100; i++) {
        await new Promise((r) => setTimeout(r, 30));
        setProgress(i);
      }
    }

    setProcessingStage("done");
    setStep("complete");
  };

  const downloadReport = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const resetModal = () => {
    setStep("select");
    setSearchQuery("");
    setSelectedProviders([]);
    setIncludeLLMGeneration(false);
    setProcessingStage("export");
    setProgress(0);
    setGeneratedReport("");
    setGeneratedSummary("");
    setGeneratedLetter("");
  };

  const handleClose = () => {
    resetModal();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Agentic Workflow
          </DialogTitle>
          <DialogDescription>
            Generate comprehensive FWA reports for selected providers with optional AI-generated penalization letters.
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, group number, or contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-provider-search"
                />
              </div>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as typeof searchType)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                data-testid="select-search-type"
              >
                <option value="all">All Fields</option>
                <option value="name">Name</option>
                <option value="id">Provider ID</option>
                <option value="group">Group Number</option>
                <option value="contact">Contact</option>
              </select>
            </div>

            {selectedProviders.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-md">
                {selectedProviders.map((provider) => (
                  <Badge
                    key={provider.id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    {provider.name}
                    <button
                      onClick={() => removeProvider(provider.id)}
                      className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      data-testid={`button-remove-provider-${provider.id}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <ScrollArea className="flex-1 border rounded-md">
              <div className="p-4 space-y-4">
                {isLoadingProviders && (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                )}

                {!isLoadingProviders && providerGroups.length > 0 && searchQuery.toLowerCase().includes("grp") && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Provider Groups
                    </h4>
                    {providerGroups
                      .filter((g) =>
                        g.groupNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        g.groupName.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((group) => {
                        const groupProvidersList = groupedProviders[group.groupNumber] || [];
                        const allSelected = groupProvidersList.every((p) =>
                          selectedProviders.some((sp) => sp.id === (p.id || p.providerId))
                        );
                        return (
                          <Card
                            key={group.groupNumber}
                            className="cursor-pointer hover-elevate"
                            onClick={() => handleGroupSelect(group.groupNumber)}
                          >
                            <CardContent className="p-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Checkbox checked={allSelected} />
                                <div>
                                  <p className="font-medium">{group.groupName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {group.groupNumber} - {group.memberCount} providers
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline">{group.groupType.replace("_", " ")}</Badge>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                )}

                {!isLoadingProviders && filteredProviders.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Providers ({filteredProviders.length})
                    </h4>
                    {filteredProviders.map((provider) => {
                      const providerId = provider.id || provider.providerId || "";
                      const providerName = provider.name || provider.providerName || "";
                      const hospital = provider.hospital || provider.hospitalName || "";
                      const aiScore = provider.aiScore || 0;
                      const isSelected = selectedProviders.some((p) => p.id === providerId);
                      return (
                        <Card
                          key={providerId}
                          className={`cursor-pointer hover-elevate ${isSelected ? "border-primary" : ""}`}
                          onClick={() => handleProviderSelect(provider)}
                          data-testid={`card-provider-${providerId}`}
                        >
                          <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox checked={isSelected} />
                              <div>
                                <p className="font-medium">{providerName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {providerId} - {provider.specialty || ""} - {hospital}
                                </p>
                                <div className="flex gap-2 mt-1">
                                  {provider.groupNumber && (
                                    <Badge variant="outline" className="text-xs">
                                      <Building2 className="h-3 w-3 mr-1" />
                                      {provider.groupNumber}
                                    </Badge>
                                  )}
                                  {provider.contactNumber && (
                                    <Badge variant="outline" className="text-xs">
                                      <Phone className="h-3 w-3 mr-1" />
                                      {provider.contactNumber}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Badge
                              variant={aiScore >= 0.7 ? "destructive" : aiScore >= 0.4 ? "secondary" : "outline"}
                            >
                              {(aiScore * 100).toFixed(0)}%
                            </Badge>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {!isLoadingProviders && searchQuery && filteredProviders.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No providers found matching "{searchQuery}"
                  </div>
                )}

                {!isLoadingProviders && !searchQuery && (
                  <div className="text-center py-8 text-muted-foreground">
                    Start typing to search for providers by name, ID, group number, or contact
                  </div>
                )}
              </div>
            </ScrollArea>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-primary" />
                  <div>
                    <Label htmlFor="llm-toggle" className="font-medium cursor-pointer">
                      Generate AI Penalization Letter
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Create a formal letter summarizing findings in a penalization tone
                    </p>
                  </div>
                </div>
                <Switch
                  id="llm-toggle"
                  checked={includeLLMGeneration}
                  onCheckedChange={setIncludeLLMGeneration}
                  data-testid="switch-llm-generation"
                />
              </div>

              {includeLLMGeneration && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium">Processing Time Notice</p>
                    <p>AI letter generation may take 15-30 seconds depending on the amount of data. The letter will summarize all FWA findings in a formal penalization tone suitable for provider negotiations.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button
                onClick={startWorkflow}
                disabled={selectedProviders.length === 0}
                data-testid="button-start-workflow"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Start Workflow ({selectedProviders.length} providers)
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
            <div className="relative">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold">Processing Agentic Workflow</h3>
              <p className="text-muted-foreground">
                {processingStage === "export" && "Generating export report..."}
                {processingStage === "summary" && "Creating summary report..."}
                {processingStage === "llm" && "AI is composing penalization letter..."}
                {processingStage === "done" && "Finalizing..."}
              </p>
            </div>

            <div className="w-full max-w-md space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">{progress}% complete</p>
            </div>

            <div className="flex gap-8 text-sm">
              <div className={`flex items-center gap-2 ${processingStage === "export" || progress >= 30 ? "text-primary" : "text-muted-foreground"}`}>
                {progress >= 30 ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                Export Report
              </div>
              <div className={`flex items-center gap-2 ${processingStage === "summary" || progress >= 60 ? "text-primary" : "text-muted-foreground"}`}>
                {progress >= 60 ? <Check className="h-4 w-4" /> : <FileBarChart className="h-4 w-4" />}
                Summary
              </div>
              {includeLLMGeneration && (
                <div className={`flex items-center gap-2 ${processingStage === "llm" || progress >= 100 ? "text-primary" : "text-muted-foreground"}`}>
                  {progress >= 100 ? <Check className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
                  AI Letter
                </div>
              )}
            </div>
          </div>
        )}

        {step === "complete" && (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
              <Check className="h-5 w-5" />
              <span className="font-medium">Workflow completed successfully</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Full Export Report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Complete CSV export with all claims, metrics, and evidence for {selectedProviders.length} providers.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => downloadReport(generatedReport, `fwa-export-${new Date().toISOString().split("T")[0]}.csv`)}
                    data-testid="button-download-export"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileBarChart className="h-4 w-4" />
                    Summary Report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Executive summary with key findings and recommendations.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => downloadReport(generatedSummary, `fwa-summary-${new Date().toISOString().split("T")[0]}.txt`)}
                    data-testid="button-download-summary"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Summary
                  </Button>
                </CardContent>
              </Card>
            </div>

            {includeLLMGeneration && generatedLetter && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    AI-Generated Penalization Letter
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] border rounded-md p-3 bg-muted/30">
                    <pre className="text-sm whitespace-pre-wrap font-mono">{generatedLetter}</pre>
                  </ScrollArea>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => downloadReport(generatedLetter, `penalization-letter-${new Date().toISOString().split("T")[0]}.txt`)}
                      data-testid="button-download-letter"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Letter
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(generatedLetter)}
                      data-testid="button-copy-letter"
                    >
                      Copy to Clipboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between mt-auto">
              <Button variant="outline" onClick={resetModal} data-testid="button-new-workflow">
                Start New Workflow
              </Button>
              <Button onClick={handleClose} data-testid="button-close">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
