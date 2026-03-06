import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Building2, User, Stethoscope, AlertTriangle, DollarSign, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";

function getRiskColor(score: number) {
  if (score >= 80) return "text-red-500";
  if (score >= 60) return "text-orange-500";
  if (score >= 40) return "text-yellow-500";
  return "text-green-500";
}

function getRiskLabel(score: number) {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function getRiskBadgeVariant(score: number): "destructive" | "default" | "secondary" | "outline" {
  if (score >= 80) return "destructive";
  if (score >= 60) return "default";
  return "secondary";
}

export default function FWAEntityProfile() {
  const params = useParams<{ entityId: string }>();
  const entityId = params.entityId;

  const path = window.location.pathname;
  const entityType = path.includes("/provider/")
    ? "provider"
    : path.includes("/doctor/")
    ? "doctor"
    : "patient";

  const endpointMap: Record<string, string> = {
    provider: `/api/fwa/high-risk/providers/${entityId}`,
    doctor: `/api/fwa/high-risk/doctors/${entityId}`,
    patient: `/api/fwa/high-risk/patients/${entityId}`,
  };

  const { data: entity, isLoading, isError } = useQuery<Record<string, unknown>>({
    queryKey: ["entity-profile", entityType, entityId],
    queryFn: async () => {
      const res = await fetch(endpointMap[entityType]);
      if (!res.ok) throw new Error("Failed to fetch entity");
      return res.json();
    },
  });

  const backPath = "/fwa/high-risk-entities";

  const EntityIcon = entityType === "provider"
    ? Building2
    : entityType === "doctor"
    ? Stethoscope
    : User;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !entity) {
    return (
      <div className="p-6 space-y-4">
        <Link href={backPath}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to High-Risk Entities
          </Button>
        </Link>
        <Card className="border-destructive">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-semibold">Entity Not Found</p>
            <p className="text-muted-foreground mt-2">
              The requested {entityType} profile could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const riskScore = typeof entity.riskScore === "number" ? entity.riskScore
    : typeof entity.risk_score === "number" ? entity.risk_score
    : 0;
  const name = String(entity.providerName ?? entity.provider_name ?? entity.patientName ?? entity.patient_name ?? entity.doctorName ?? entity.doctor_name ?? `${entityType} ${entityId}`);
  const totalClaims = Number(entity.totalClaims ?? entity.total_claims ?? 0);
  const totalAmount = Number(entity.totalAmount ?? entity.total_amount ?? 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={backPath}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <EntityIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{name}</h1>
            <p className="text-sm text-muted-foreground capitalize">{entityType} Profile</p>
          </div>
        </div>
        <Badge variant={getRiskBadgeVariant(riskScore)} className="ml-auto">
          {getRiskLabel(riskScore)} Risk
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Risk Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getRiskColor(riskScore)}`}>
              {riskScore.toFixed(1)}
            </div>
            <Progress value={riskScore} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Total Claims
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalClaims.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalAmount.toLocaleString("en-US", { style: "currency", currency: "SAR", maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entity Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(entity)
              .filter(([k]) => !["id", "__proto__"].includes(k))
              .map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <p className="text-xs text-muted-foreground capitalize">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm font-medium">
                    {value === null || value === undefined
                      ? "—"
                      : typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value)}
                  </p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
