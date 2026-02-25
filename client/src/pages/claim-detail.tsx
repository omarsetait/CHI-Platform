import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskScoreDisplay } from "@/components/risk-score-display";
import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FlaskConical, Scan, Stethoscope, Pill, FileX } from "lucide-react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ServiceType = "laboratory" | "imagery" | "procedure" | "medication";

interface ClaimService {
  id: string;
  serviceType: ServiceType;
  description: string;
  cost: number;
  quantity: number;
  adjudicationStatus: string;
  gssPhase: string;
  standardServiceCode: string;
  internalProviderCode: string;
  rejectionReason?: string;
}

interface Claim {
  id: string;
  claimNumber: string;
  policyNumber: string;
  registrationDate: string;
  claimType: string;
  hospital: string;
  hospitalName: string;
  amount: number;
  outlierScore: number;
  icd: string;
  icdDescription?: string;
  hasSurgery?: string;
  surgeryFee?: number;
  hasIcu?: string;
  lengthOfStay: number;
  similarClaims?: number;
  similarClaimsInHospital?: number;
  services?: ClaimService[];
  riskIndicators?: any[];
}

const serviceTypeConfig: Record<ServiceType, { icon: typeof FlaskConical; label: string; color: string }> = {
  laboratory: { icon: FlaskConical, label: "Laboratory", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  imagery: { icon: Scan, label: "Imagery", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  procedure: { icon: Stethoscope, label: "Procedure", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  medication: { icon: Pill, label: "Medication", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
};

export default function ClaimDetail() {
  const [, params] = useRoute("/claims/:id");
  const [, setLocation] = useLocation();
  const [selectedService, setSelectedService] = useState<ClaimService | null>(null);

  const { data: claim, isLoading, error } = useQuery<Claim>({
    queryKey: ["/api/demo/claims", params?.id],
    enabled: !!params?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/claims")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Claim Detail</h1>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <FileX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Claim Not Found</h3>
            <p className="text-muted-foreground">The requested claim could not be found.</p>
            <Button
              variant="outline"
              onClick={() => setLocation("/claims")}
              className="mt-4"
              data-testid="button-go-back"
            >
              Back to Claims
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const services = claim.services;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/claims")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-claim-id">
            Claim ID: {claim.claimNumber}
          </h1>
          <p className="text-muted-foreground mt-1">
            ICD: <span className="font-medium">{claim.icd}</span> • {claim.icdDescription || "Acute appendicitis"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <RiskScoreDisplay score={claim.outlierScore} />
        
        <Card data-testid="card-total-bill">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">Total Bill</p>
            <div className="text-3xl font-bold text-foreground">
              {claim.amount.toLocaleString()} SGD
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-similar-claims">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">Similar Claims</p>
            <div className="text-3xl font-bold text-foreground">
              {claim.similarClaims || 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-similar-hospital">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Similar Claims in This Hospital
            </p>
            <div className="text-3xl font-bold text-foreground">
              {claim.similarClaimsInHospital || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Claim Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Claim Type</span>
              <span className="text-sm font-medium">{claim.claimType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Has Surgery</span>
              <span className="text-sm font-medium">{claim.hasSurgery || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Surgery Fee</span>
              <span className="text-sm font-medium">
                {claim.surgeryFee ? `${claim.surgeryFee.toLocaleString()} SGD` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Has ICU</span>
              <span className="text-sm font-medium">{claim.hasIcu || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Length of Stay</span>
              <span className="text-sm font-medium">{claim.lengthOfStay} days</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Policy Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Policy Number</span>
              <span className="text-sm font-medium">{claim.policyNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Registration Date</span>
              <span className="text-sm font-medium">{claim.registrationDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Hospital</span>
              <span className="text-sm font-medium">{claim.hospital || claim.hospitalName}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {services && services.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Claim Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {services.map((service) => {
                const config = serviceTypeConfig[service.serviceType];
                const IconComponent = config?.icon || FlaskConical;
                return (
                  <div
                    key={service.id}
                    onClick={() => setSelectedService(service)}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card cursor-pointer hover-elevate transition-all"
                    data-testid={`service-item-${service.id}`}
                  >
                    <div className={`p-2 rounded-md ${config?.color || "bg-gray-100"}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">{config?.label || "Service"}</span>
                        <Badge 
                          variant={service.adjudicationStatus === "Accepted" ? "default" : "destructive"}
                          className="text-xs px-1.5 py-0"
                        >
                          {service.adjudicationStatus}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium truncate">{service.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">
                          {service.cost.toLocaleString()} SGD
                        </span>
                        <span className="text-xs text-muted-foreground">x{service.quantity}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {claim.riskIndicators && claim.riskIndicators.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">DETAILS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">KEY RISK INDICATOR</TableHead>
                    <TableHead className="font-semibold text-right">OUTLIER SCORE</TableHead>
                    <TableHead className="font-semibold text-right">COST</TableHead>
                    <TableHead className="font-semibold text-right">QUANTITY</TableHead>
                    <TableHead className="font-semibold text-right">LOWER BOUND</TableHead>
                    <TableHead className="font-semibold text-right">UPPER BOUND</TableHead>
                    <TableHead className="font-semibold text-center">ADJUDICATION</TableHead>
                    <TableHead className="font-semibold text-center">GSS PHASE</TableHead>
                    <TableHead className="font-semibold">REASON</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claim.riskIndicators.map((indicator: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{indicator.name}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {indicator.outlierScore?.toFixed(2) || "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <div className="font-medium">
                            {indicator.cost !== undefined && indicator.cost !== null 
                              ? `${indicator.cost.toLocaleString()} SGD`
                              : indicator.value || "-"
                            }
                          </div>
                          {indicator.occurrence && (
                            <div className="text-xs text-muted-foreground">
                              Occurrence: {indicator.occurrence}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {indicator.quantity !== undefined ? indicator.quantity : "-"}
                      </TableCell>
                      <TableCell className="text-right">{indicator.lowerBound || "-"}</TableCell>
                      <TableCell className="text-right">{indicator.upperBound || "-"}</TableCell>
                      <TableCell className="text-center">
                        {indicator.adjudicationStatus && (
                          <Badge 
                            variant={indicator.adjudicationStatus === "Accepted" ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {indicator.adjudicationStatus}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {indicator.gssPhase && (
                          <Badge 
                            variant="outline"
                            className={`text-xs ${
                              indicator.gssPhase === "Pre-GSS" 
                                ? "border-blue-500 text-blue-600 dark:text-blue-400" 
                                : "border-amber-500 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {indicator.gssPhase}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {indicator.reason && (
                          <RiskBadge type={indicator.reason as any} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedService && (
                <>
                  {(() => {
                    const config = serviceTypeConfig[selectedService.serviceType];
                    const IconComponent = config?.icon || FlaskConical;
                    return (
                      <div className={`p-2 rounded-md ${config?.color || "bg-gray-100"}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                    );
                  })()}
                  Service Code Details
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedService && (
            <div className="space-y-4">
              <div>
                <p className="font-medium text-lg">{selectedService.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant={selectedService.adjudicationStatus === "Accepted" ? "default" : "destructive"}
                  >
                    {selectedService.adjudicationStatus}
                  </Badge>
                  <Badge variant="outline" className={`${
                    selectedService.gssPhase === "Pre-GSS" 
                      ? "border-blue-500 text-blue-600 dark:text-blue-400" 
                      : "border-amber-500 text-amber-600 dark:text-amber-400"
                  }`}>
                    {selectedService.gssPhase}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cost</p>
                  <p className="font-semibold">{selectedService.cost.toLocaleString()} SGD</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <p className="font-semibold">{selectedService.quantity}</p>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Standard Service Code</p>
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-2 bg-muted rounded-md font-mono text-sm flex-1">
                      {selectedService.standardServiceCode}
                    </code>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Internal Provider Code</p>
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-2 bg-muted rounded-md font-mono text-sm flex-1">
                      {selectedService.internalProviderCode}
                    </code>
                  </div>
                </div>
              </div>

              {selectedService.rejectionReason && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                  <p className="text-sm text-muted-foreground">Rejection Reason</p>
                  <p className="font-medium text-red-700 dark:text-red-400">{selectedService.rejectionReason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
