import type { ElementType } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Building2, User, Stethoscope, AlertTriangle,
  DollarSign, Activity, ShieldCheck, BarChart3, Cpu, Brain, FileSearch,
} from "lucide-react";
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

type EngineScoreKey = "rule_engine_score" | "statistical_score" | "unsupervised_score" | "rag_llm_score" | "semantic_score";

interface DetectionResult {
  composite_score: string;
  risk_level: string;
  rule_engine_score?: string;
  statistical_score?: string;
  unsupervised_score?: string;
  rag_llm_score?: string;
  semantic_score?: string;
}

const ENGINE_CONFIG: Array<{ key: EngineScoreKey; label: string; icon: ElementType; color: string; weight: string }> = [
  { key: "rule_engine_score", label: "Rule Engine", icon: ShieldCheck, color: "#3b82f6", weight: "30%" },
  { key: "statistical_score", label: "Statistical", icon: BarChart3, color: "#22c55e", weight: "22%" },
  { key: "unsupervised_score", label: "Unsupervised", icon: Cpu, color: "#a855f7", weight: "18%" },
  { key: "rag_llm_score", label: "RAG / LLM", icon: Brain, color: "#f59e0b", weight: "15%" },
  { key: "semantic_score", label: "Semantic", icon: FileSearch, color: "#06b6d4", weight: "15%" },
];

function EngineBreakdownCard({ detection, isLoading }: { detection: DetectionResult | null | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-500" />
            Detection Engine Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ENGINE_CONFIG.map((e) => (
            <Skeleton key={e.key} className="h-6 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!detection) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-500" />
            Detection Engine Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No detection results available for this entity.</p>
        </CardContent>
      </Card>
    );
  }

  const compositeScore = parseFloat(detection.composite_score || "0");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-purple-500" />
          Detection Engine Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">Composite Score</span>
            <span
              className="font-bold text-xl"
              style={{
                color: compositeScore >= 80 ? "#ef4444" : compositeScore >= 60 ? "#f97316" : compositeScore >= 40 ? "#eab308" : "#22c55e",
              }}
              data-testid="composite-score-value"
            >
              {compositeScore.toFixed(1)}
            </span>
          </div>
          <Progress value={compositeScore} className="h-2" />
          <p className="text-xs text-muted-foreground">Weighted combination of all 5 detection engines</p>
        </div>

        <div className="space-y-3 pt-2 border-t">
          {ENGINE_CONFIG.map(({ key, label, icon: Icon, color, weight }) => {
            const score = parseFloat(detection[key] ?? "0");
            return (
              <div key={key} className="space-y-1" data-testid={`engine-score-${key}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 flex-shrink-0" style={{ color }} />
                    <span className="text-sm font-medium">{label}</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{weight}</Badge>
                  </div>
                  <span className="text-sm font-mono font-semibold" style={{ color }}>
                    {score.toFixed(1)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(score, 100)}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
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

  const detectionEndpointMap: Record<string, string> = {
    provider: `/api/fwa/entity-detection/provider/${entityId}`,
    doctor: `/api/fwa/entity-detection/doctor/${entityId}`,
    patient: `/api/fwa/entity-detection/patient/${entityId}`,
  };

  const { data: entity, isLoading, isError } = useQuery<Record<string, unknown>>({
    queryKey: ["entity-profile", entityType, entityId],
    queryFn: async () => {
      const res = await fetch(endpointMap[entityType]);
      if (!res.ok) throw new Error("Failed to fetch entity");
      return res.json();
    },
  });

  const { data: detection, isLoading: isDetectionLoading } = useQuery<DetectionResult | null>({
    queryKey: ["entity-detection", entityType, entityId],
    queryFn: async (): Promise<DetectionResult | null> => {
      const res = await fetch(detectionEndpointMap[entityType]);
      if (!res.ok) return null;
      return res.json() as Promise<DetectionResult>;
    },
    enabled: !!entityId,
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
  const totalAmount = Number(entity.totalAmount ?? entity.total_amount ?? entity.totalExposure ?? entity.total_exposure ?? 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={backPath}>
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <EntityIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-entity-name">{name}</h1>
            <p className="text-sm text-muted-foreground capitalize">{entityType} Profile</p>
          </div>
        </div>
        <Badge variant={getRiskBadgeVariant(riskScore)} className="ml-auto" data-testid="badge-risk-level">
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
            <div className={`text-3xl font-bold ${getRiskColor(riskScore)}`} data-testid="text-risk-score">
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
            <div className="text-3xl font-bold" data-testid="text-total-claims">{totalClaims.toLocaleString()}</div>
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
            <div className="text-3xl font-bold" data-testid="text-total-amount">
              {totalAmount.toLocaleString("en-US", { style: "currency", currency: "SAR", maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <EngineBreakdownCard detection={detection} isLoading={isDetectionLoading} />

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
                  <p className="text-sm font-medium" data-testid={`text-detail-${key}`}>
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
