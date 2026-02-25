import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ShieldCheck, Brain, BarChart3, Network,
  Info, CheckCircle, AlertTriangle, Zap,
  Save, RotateCcw, Settings2, Sparkles, TrendingUp,
  TrendingDown, Check, X, Loader2, Database, Users, Building2, 
  RefreshCw, Clock, Layers, Activity, ChevronDown, DollarSign,
  Timer, History, LineChart, Scale, AlertCircle
} from "lucide-react";

// Complete 62-Feature Vector definitions with bilingual explanations
const FEATURE_DEFINITIONS = {
  amount: {
    icon: DollarSign,
    color: "text-green-500",
    features: [
      { name: "claim_amount", en: "Total claim amount in SAR", ar: "إجمالي مبلغ المطالبة بالريال" },
      { name: "surgery_fee", en: "Surgery/procedure fee portion", ar: "جزء رسوم الجراحة/الإجراء" },
      { name: "amount_log", en: "Log-transformed amount for normalization", ar: "المبلغ المحول لوغاريتمياً للتطبيع" },
      { name: "amount_zscore", en: "Standard deviations from population mean", ar: "الانحرافات المعيارية عن متوسط السكان" },
      { name: "amount_percentile", en: "Percentile rank vs all claims", ar: "ترتيب النسبة المئوية مقارنة بجميع المطالبات" },
      { name: "amount_vs_provider_avg", en: "Ratio to provider's average claim", ar: "النسبة إلى متوسط مطالبات المزود" },
      { name: "amount_vs_member_avg", en: "Ratio to patient's average claim", ar: "النسبة إلى متوسط مطالبات المريض" },
      { name: "amount_vs_peer_avg", en: "Ratio to specialty peer group average", ar: "النسبة إلى متوسط مجموعة الأقران" },
    ]
  },
  frequency: {
    icon: Activity,
    color: "text-blue-500",
    features: [
      { name: "diagnosis_count", en: "Number of diagnoses on claim", ar: "عدد التشخيصات في المطالبة" },
      { name: "procedure_count", en: "Number of procedures billed", ar: "عدد الإجراءات المفوترة" },
      { name: "procedure_density", en: "Procedures per diagnosis ratio", ar: "نسبة الإجراءات لكل تشخيص" },
      { name: "same_day_claims", en: "Other claims from same provider/day", ar: "مطالبات أخرى من نفس المزود/اليوم" },
      { name: "days_since_last_claim", en: "Days since patient's previous claim", ar: "أيام منذ المطالبة السابقة للمريض" },
      { name: "is_high_utilizer", en: "Patient flagged as high utilizer", ar: "تم تصنيف المريض كمستخدم عالي" },
    ]
  },
  providerHistory: {
    icon: Building2,
    color: "text-purple-500",
    features: [
      { name: "provider_claim_count_7d", en: "Provider claims in last 7 days", ar: "مطالبات المزود في آخر 7 أيام" },
      { name: "provider_claim_count_30d", en: "Provider claims in last 30 days", ar: "مطالبات المزود في آخر 30 يوماً" },
      { name: "provider_claim_count_90d", en: "Provider claims in last 90 days", ar: "مطالبات المزود في آخر 90 يوماً" },
      { name: "provider_avg_amount", en: "Provider's average claim amount", ar: "متوسط مبلغ مطالبات المزود" },
      { name: "provider_std_amount", en: "Standard deviation of provider amounts", ar: "الانحراف المعياري لمبالغ المزود" },
      { name: "provider_unique_patients", en: "Unique patients served by provider", ar: "المرضى الفريدين الذين يخدمهم المزود" },
      { name: "provider_denial_rate", en: "Provider's historical denial rate", ar: "معدل الرفض التاريخي للمزود" },
      { name: "provider_flag_rate", en: "Provider's historical flag rate", ar: "معدل التنبيه التاريخي للمزود" },
      { name: "provider_weekend_ratio", en: "Ratio of weekend claims", ar: "نسبة مطالبات عطلة نهاية الأسبوع" },
      { name: "provider_surgery_rate", en: "Surgical procedure ratio", ar: "نسبة الإجراءات الجراحية" },
    ]
  },
  memberHistory: {
    icon: Users,
    color: "text-amber-500",
    features: [
      { name: "member_claim_count", en: "Total claims by this patient", ar: "إجمالي المطالبات لهذا المريض" },
      { name: "member_unique_providers", en: "Different providers visited", ar: "المزودين المختلفين الذين تمت زيارتهم" },
      { name: "member_unique_diagnoses", en: "Different diagnoses received", ar: "التشخيصات المختلفة المستلمة" },
      { name: "member_total_amount", en: "Lifetime claim amount total", ar: "إجمالي مبلغ المطالبات مدى الحياة" },
      { name: "member_avg_amount", en: "Patient's average claim amount", ar: "متوسط مبلغ مطالبات المريض" },
      { name: "member_surgery_count", en: "Number of surgical procedures", ar: "عدد الإجراءات الجراحية" },
      { name: "member_icu_count", en: "Number of ICU admissions", ar: "عدد حالات دخول العناية المركزة" },
    ]
  },
  temporalPatterns: {
    icon: Clock,
    color: "text-cyan-500",
    features: [
      { name: "claim_hour", en: "Hour of day claim submitted", ar: "ساعة تقديم المطالبة في اليوم" },
      { name: "claim_day_of_week", en: "Day of week (0=Sunday)", ar: "يوم الأسبوع (0=الأحد)" },
      { name: "is_weekend", en: "Submitted on weekend", ar: "تم تقديمها في عطلة نهاية الأسبوع" },
      { name: "is_night_claim", en: "Submitted during night hours", ar: "تم تقديمها خلال ساعات الليل" },
      { name: "length_of_stay", en: "Days of hospitalization", ar: "أيام الإقامة في المستشفى" },
      { name: "los_vs_expected", en: "LOS vs diagnosis-expected stay", ar: "مدة الإقامة مقارنة بالمتوقعة للتشخيص" },
      { name: "trend_7d_vs_30d", en: "Recent vs monthly activity trend", ar: "اتجاه النشاط الأخير مقارنة بالشهري" },
      { name: "frequency_acceleration", en: "Rate of claim frequency increase", ar: "معدل تسارع تكرار المطالبات" },
      { name: "burst_pattern_score", en: "Clustering of claims in time", ar: "تجمع المطالبات في الوقت" },
    ]
  },
  peerComparison: {
    icon: Scale,
    color: "text-indigo-500",
    features: [
      { name: "specialty_percentile", en: "Rank within specialty peer group", ar: "الترتيب ضمن مجموعة أقران التخصص" },
      { name: "region_percentile", en: "Rank within geographic region", ar: "الترتيب ضمن المنطقة الجغرافية" },
      { name: "peer_group_zscore", en: "Standard deviations from peer mean", ar: "الانحرافات المعيارية عن متوسط الأقران" },
      { name: "peer_denial_comparison", en: "Denial rate vs peer average", ar: "معدل الرفض مقارنة بمتوسط الأقران" },
      { name: "peer_flag_comparison", en: "Flag rate vs peer average", ar: "معدل التنبيه مقارنة بمتوسط الأقران" },
      { name: "peer_amount_ratio", en: "Amount ratio to peer median", ar: "نسبة المبلغ إلى متوسط الأقران" },
    ]
  },
  derivedFeatures: {
    icon: LineChart,
    color: "text-rose-500",
    features: [
      { name: "outlier_score", en: "Combined statistical outlier score", ar: "درجة القيمة المتطرفة الإحصائية المجمعة" },
      { name: "procedure_diagnosis_mismatch", en: "Procedures inconsistent with diagnoses", ar: "الإجراءات غير المتسقة مع التشخيصات" },
      { name: "amount_procedure_ratio", en: "Amount per procedure billed", ar: "المبلغ لكل إجراء مفوتر" },
      { name: "complexity_score", en: "Overall claim complexity index", ar: "مؤشر تعقيد المطالبة الإجمالي" },
      { name: "risk_indicator_count", en: "Number of risk flags triggered", ar: "عدد علامات المخاطر المثارة" },
      { name: "historical_pattern_match", en: "Similarity to known fraud patterns", ar: "التشابه مع أنماط الاحتيال المعروفة" },
    ]
  },
  entityRisk: {
    icon: AlertCircle,
    color: "text-red-500",
    features: [
      { name: "provider_risk_score", en: "Provider's cumulative risk score", ar: "درجة المخاطر التراكمية للمزود" },
      { name: "member_risk_score", en: "Patient's cumulative risk score", ar: "درجة المخاطر التراكمية للمريض" },
      { name: "doctor_risk_score", en: "Referring doctor's risk score", ar: "درجة مخاطر الطبيب المحيل" },
      { name: "entity_network_score", en: "Network connection risk factor", ar: "عامل خطر اتصال الشبكة" },
      { name: "cross_entity_anomaly", en: "Unusual entity combinations", ar: "تركيبات الكيانات غير العادية" },
      { name: "collusion_indicator", en: "Potential collusion pattern match", ar: "مطابقة نمط التواطؤ المحتمل" },
    ]
  }
};

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  amount: { en: "Amount Features", ar: "ميزات المبلغ" },
  frequency: { en: "Frequency Features", ar: "ميزات التكرار" },
  providerHistory: { en: "Provider History", ar: "تاريخ المزود" },
  memberHistory: { en: "Member History", ar: "تاريخ العضو" },
  temporalPatterns: { en: "Temporal Patterns", ar: "الأنماط الزمنية" },
  peerComparison: { en: "Peer Comparison", ar: "مقارنة الأقران" },
  derivedFeatures: { en: "Derived Features", ar: "الميزات المشتقة" },
  entityRisk: { en: "Entity Risk", ar: "مخاطر الكيان" }
};

interface DetectionConfig {
  id: string;
  method: string;
  name: string;
  isEnabled: boolean;
  weight: string;
  threshold: string;
  description: string;
}

const methodIcons: Record<string, typeof Brain> = {
  rule_engine: ShieldCheck,
  statistical_learning: BarChart3,
  unsupervised_learning: Network,
  rag_llm: Brain,
  semantic_validation: Database
};

const methodColors: Record<string, string> = {
  rule_engine: "text-blue-500",
  statistical_learning: "text-green-500",
  unsupervised_learning: "text-purple-500",
  rag_llm: "text-amber-500",
  semantic_validation: "text-cyan-500"
};

const methodBorderColors: Record<string, string> = {
  rule_engine: "#3b82f6",
  statistical_learning: "#22c55e",
  unsupervised_learning: "#a855f7",
  rag_llm: "#f59e0b",
  semantic_validation: "#06b6d4"
};

const methodDetails: Record<string, {
  algorithmName: string;
  algorithmType: string;
  howItWorks: string;
  strengths: string;
  limitations: string;
  dataSources: string[];
  outputMetrics: string[];
}> = {
  rule_engine: {
    algorithmName: "Pattern Matching Engine",
    algorithmType: "Rule-Based System",
    howItWorks: "Evaluates claims against configurable detection rules stored in the FWA Rules Library. Each rule defines field conditions (operators like 'greater_than', 'equals', 'in') that are checked against claim data. When conditions match, a severity-weighted score is computed based on rule priority and category.",
    strengths: "High explainability, fast execution, deterministic results, zero false positives on known patterns",
    limitations: "Cannot detect novel fraud patterns not covered by existing rules, requires manual rule maintenance",
    dataSources: ["FWA Rules Library", "Policy Violation Catalogue", "FWA Behaviors Database"],
    outputMetrics: ["Matched Rules Count", "Violation Severity Score", "Rule Categories Triggered"]
  },
  statistical_learning: {
    algorithmName: "Heuristic Scoring Engine",
    algorithmType: "Statistical Analysis",
    howItWorks: "Computes risk scores using statistical heuristics including z-score calculations for claim amounts, peer comparison against provider/specialty benchmarks, rejection rate analysis, and temporal trend detection. Combines multiple signals into a weighted composite score.",
    strengths: "Adapts to regional/specialty variations, provides peer context, identifies statistical outliers",
    limitations: "Heuristic-based (not ML), may miss complex patterns, requires representative benchmark data",
    dataSources: ["Historical Claims Data", "Provider Peer Groups", "Specialty Benchmarks"],
    outputMetrics: ["Z-Score", "Peer Percentile", "Trend Direction", "Prediction Confidence"]
  },
  unsupervised_learning: {
    algorithmName: "Enterprise ML Engine",
    algorithmType: "Multi-Algorithm Ensemble (5 Models)",
    howItWorks: "Extracts 62 features (24 raw + 38 engineered) from claims including temporal patterns (7/30/60/90-day windows), entity aggregations, and peer comparisons. Runs 5 real ML algorithms in parallel: Isolation Forest (tree-based anomaly detection), LOF (local density analysis), DBSCAN (density clustering), Autoencoder (reconstruction error), and Deep Learning (pattern matching). Combines weighted scores into composite risk assessment with full explainability.",
    strengths: "Enterprise-grade detection with 62 features, 5 ML algorithms, temporal behavior tracking, peer group baselines, and human-readable explanations in English/Arabic",
    limitations: "Higher computational cost than rules, requires feature store aggregation, may need threshold tuning per specialty",
    dataSources: ["62-Feature Vector", "Provider/Member Feature Store", "Peer Group Baselines", "Temporal Windows"],
    outputMetrics: ["Composite Score", "Per-Algorithm Scores", "Top Contributing Features", "Peer Percentile", "Human Explanation"]
  },
  rag_llm: {
    algorithmName: "AI Contextual Analysis",
    algorithmType: "LLM-Powered Analysis",
    howItWorks: "Uses AI embedding models to match claims against a knowledge base of regulatory documents and medical guidelines. The AI then analyzes the claim with retrieved context to provide natural language risk assessments and evidence-based recommendations.",
    strengths: "Understands context and nuance, provides natural language explanations, links to regulatory sources",
    limitations: "Higher latency than other methods, requires API connectivity, may need human verification",
    dataSources: ["Regulatory Documents", "Medical Guidelines", "Historical Case Narratives"],
    outputMetrics: ["Narrative Confidence", "Evidence Citations", "Recommendation Text"]
  },
  semantic_validation: {
    algorithmName: "ICD-10/CPT Vector Similarity",
    algorithmType: "Semantic Embedding Model",
    howItWorks: "Validates procedure-diagnosis relationships using vector embeddings. CPT codes (~9,800) and ICD-10 codes (~72,000) are embedded using AI embedding models. Cosine similarity between procedure and diagnosis embeddings determines clinical compatibility.",
    strengths: "Catches clinically implausible procedure-diagnosis combinations; no rules needed; quantitative similarity scores; works across all specialties",
    limitations: "Requires embedding generation for code databases; may miss context-dependent valid combinations; depends on quality of code descriptions",
    dataSources: ["CPT Embeddings Database (~9,800 codes)", "ICD-10 Embeddings Database (~72,000 codes)", "AI Embedding Model (1536 dimensions)"],
    outputMetrics: ["Similarity Score (%)", "Risk Level", "Clinical Compatibility Assessment"]
  }
};

export default function EngineConfiguration() {
  const { toast } = useToast();
  const [localConfigs, setLocalConfigs] = useState<DetectionConfig[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: configs = [], isLoading } = useQuery<DetectionConfig[]>({
    queryKey: ["/api/fwa/detection/configs"],
    refetchOnMount: true,
  });

  useEffect(() => {
    if (configs.length > 0 && localConfigs.length === 0) {
      setLocalConfigs(configs);
    }
  }, [configs]);

  const updateConfigMutation = useMutation({
    mutationFn: async (config: DetectionConfig) => {
      const response = await fetch(`/api/fwa/detection/configs/${config.method}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isEnabled: config.isEnabled,
          weight: parseFloat(config.weight),
          threshold: parseFloat(config.threshold)
        }),
      });
      if (!response.ok) throw new Error("Failed to update");
      return response.json();
    },
  });

  const displayConfigs = localConfigs.length > 0 ? localConfigs : configs;
  const totalWeight = displayConfigs
    .filter(c => c.isEnabled)
    .reduce((sum, c) => sum + parseFloat(c.weight || "0"), 0);

  const handleToggle = (method: string, enabled: boolean) => {
    const updated = localConfigs.map(c => 
      c.method === method ? { ...c, isEnabled: enabled } : c
    );
    setLocalConfigs(updated);
    setHasChanges(true);
  };

  const handleWeightChange = (method: string, newWeight: number) => {
    const updated = localConfigs.map(c => 
      c.method === method ? { ...c, weight: (newWeight / 100).toFixed(2) } : c
    );
    setLocalConfigs(updated);
    setHasChanges(true);
  };

  const handleThresholdChange = (method: string, newThreshold: number) => {
    const updated = localConfigs.map(c => 
      c.method === method ? { ...c, threshold: (newThreshold / 100).toFixed(2) } : c
    );
    setLocalConfigs(updated);
    setHasChanges(true);
  };

  const saveAllChanges = async () => {
    try {
      for (const config of localConfigs) {
        await updateConfigMutation.mutateAsync(config);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/detection/configs"] });
      toast({ title: "Configuration saved", description: "Detection engine settings updated successfully" });
      setHasChanges(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save configuration", variant: "destructive" });
    }
  };

  const resetChanges = () => {
    setLocalConfigs(configs);
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <Skeleton className="h-32" />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-96" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title">
            <Zap className="h-6 w-6 text-purple-600" />
            Engine Configuration
          </h1>
          <p className="text-muted-foreground">
            Adjust method weights, thresholds, and detection settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetChanges} disabled={!hasChanges} data-testid="button-reset">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={saveAllChanges} disabled={!hasChanges || updateConfigMutation.isPending} data-testid="button-save">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              How Composite Scoring Works
            </h4>
            <p className="text-sm text-muted-foreground">
              Each claim is analyzed by all enabled detection methods independently. The composite risk score is calculated as a weighted sum of individual method scores. 
              The result is categorized as Low (0-30), Medium (30-60), High (60-80), or Critical (80-100).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Weight Distribution
          </CardTitle>
          <CardDescription>
            Total weights of enabled methods: {(totalWeight * 100).toFixed(0)}% 
            {Math.abs(totalWeight - 1) > 0.01 && (
              <span className="text-amber-600 ml-2">(should sum to 100%)</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-8 rounded-lg overflow-hidden mb-4">
            {displayConfigs.filter(c => c.isEnabled).map(config => {
              const weight = parseFloat(config.weight) * 100;
              const bgColor = config.method === "rule_engine" ? "bg-blue-500" :
                              config.method === "statistical_learning" ? "bg-green-500" :
                              config.method === "unsupervised_learning" ? "bg-purple-500" :
                              config.method === "rag_llm" ? "bg-amber-500" : "bg-pink-500";
              return (
                <div
                  key={config.method}
                  className={`${bgColor} flex items-center justify-center text-white text-xs font-medium transition-all`}
                  style={{ width: `${(weight / (totalWeight * 100)) * 100}%` }}
                >
                  {weight >= 10 ? `${weight.toFixed(0)}%` : ""}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4">
            {displayConfigs.map(config => {
              const bgColor = config.method === "rule_engine" ? "bg-blue-500" :
                              config.method === "statistical_learning" ? "bg-green-500" :
                              config.method === "unsupervised_learning" ? "bg-purple-500" :
                              config.method === "rag_llm" ? "bg-amber-500" : "bg-pink-500";
              return (
                <div key={config.method} className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${bgColor} ${!config.isEnabled ? 'opacity-30' : ''}`} />
                  <span className={`text-sm ${!config.isEnabled ? 'text-muted-foreground line-through' : ''}`}>
                    {config.name}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {displayConfigs.map((config) => {
          const Icon = methodIcons[config.method] || Brain;
          const colorClass = methodColors[config.method] || "text-gray-500";
          const borderColor = methodBorderColors[config.method] || "#6b7280";
          const details = methodDetails[config.method];
          const weight = parseFloat(config.weight) * 100;
          const threshold = parseFloat(config.threshold || "0.70") * 100;
          
          return (
            <Card 
              key={config.method} 
              className={`border-l-4 ${!config.isEnabled ? 'opacity-60' : ''}`} 
              style={{ borderLeftColor: borderColor }} 
              data-testid={`config-card-${config.method}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      <p className="text-sm font-medium text-muted-foreground">{details?.algorithmName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={config.isEnabled}
                      onCheckedChange={(checked) => handleToggle(config.method, checked)}
                      data-testid={`switch-${config.method}`}
                    />
                    <Badge variant={config.isEnabled ? "default" : "secondary"}>
                      {config.isEnabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h5 className="text-sm font-medium mb-1">Algorithm Type</h5>
                  <p className="text-sm text-muted-foreground">{details?.algorithmType}</p>
                </div>
                
                <div>
                  <h5 className="text-sm font-medium mb-1">Description</h5>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                </div>

                <div>
                  <h5 className="text-sm font-medium mb-1">How It Works</h5>
                  <p className="text-sm text-muted-foreground">{details?.howItWorks}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium mb-1 text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Strengths
                    </h5>
                    <p className="text-xs text-muted-foreground">{details?.strengths}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium mb-1 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Limitations
                    </h5>
                    <p className="text-xs text-muted-foreground">{details?.limitations}</p>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium mb-2">Data Sources</h5>
                  <div className="flex flex-wrap gap-1">
                    {details?.dataSources.map((source, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">{source}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium mb-2">Output Metrics</h5>
                  <div className="flex flex-wrap gap-1">
                    {details?.outputMetrics.map((metric, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">{metric}</Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Weight in Composite Score</Label>
                      <Badge variant="outline" className="font-mono">{weight.toFixed(0)}%</Badge>
                    </div>
                    <Slider
                      value={[weight]}
                      onValueChange={([val]) => handleWeightChange(config.method, val)}
                      max={100}
                      step={5}
                      disabled={!config.isEnabled}
                      data-testid={`slider-weight-${config.method}`}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Alert Threshold</Label>
                      <Badge variant="outline" className="font-mono">{threshold.toFixed(0)}%</Badge>
                    </div>
                    <Slider
                      value={[threshold]}
                      onValueChange={([val]) => handleThresholdChange(config.method, val)}
                      max={100}
                      step={5}
                      disabled={!config.isEnabled}
                      data-testid={`slider-threshold-${config.method}`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Claims scoring above this threshold will be flagged for review
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <FeatureStoreSection toast={toast} />
      <StatisticalLearningSection toast={toast} />
      <WeightProposalsSection toast={toast} />
    </div>
  );
}

interface FeatureStoreStats {
  featureStore: { providers: number; members: number };
  peerBaselines: number;
  modelRegistry: number;
  inference: { totalAnalyzed: number };
  learnedPatterns: number;
}

interface StatisticalEngineStatus {
  success: boolean;
  status: {
    engine: string;
    featureCount: number;
    populationStats: {
      count: number;
      coverage: string;
      oldestCalculation: string | null;
      needsRecalculation: boolean;
      missingFeatures: number;
    };
    featureWeights: {
      count: number;
      coverage: string;
      configured: boolean;
      note: string;
    };
    systemReady: boolean;
    capabilities: string[];
  };
}

interface PopulationStat {
  id: number;
  featureName: string;
  mean: string;
  stdDev: string;
  min: string;
  max: string;
  percentile25: string;
  percentile50: string;
  percentile75: string;
  percentile90: string;
  percentile99: string;
  sampleSize: number;
  calculatedAt: string;
}

interface FeatureWeight {
  id: number;
  featureName: string;
  weight: string;
  category: string;
  direction: string;
  updatedAt: string;
}

function StatisticalLearningSection({ toast }: { toast: any }) {
  const [showStats, setShowStats] = useState(false);
  const [showWeights, setShowWeights] = useState(false);

  const { data: engineStatus, isLoading: statusLoading } = useQuery<StatisticalEngineStatus>({
    queryKey: ["/api/fwa/statistical/engine-status"],
  });

  const { data: populationStats, isLoading: statsLoading } = useQuery<{ success: boolean; count: number; statistics: PopulationStat[] }>({
    queryKey: ["/api/fwa/statistical/population-stats"],
    enabled: showStats,
  });

  const { data: featureWeights, isLoading: weightsLoading } = useQuery<{ success: boolean; count: number; weights: FeatureWeight[] }>({
    queryKey: ["/api/fwa/statistical/feature-weights"],
    enabled: showWeights,
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/fwa/statistical/population-stats/recalculate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/statistical/population-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/statistical/engine-status"] });
      toast({
        title: "Statistics Recalculated",
        description: "Population statistics have been recalculated from the claim database.",
      });
    },
    onError: () => {
      toast({
        title: "Recalculation Failed",
        description: "Failed to recalculate population statistics.",
        variant: "destructive",
      });
    },
  });

  const initializeWeightsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/fwa/statistical/feature-weights/initialize");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/statistical/feature-weights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/statistical/engine-status"] });
      toast({
        title: "Weights Initialized",
        description: "Feature weights have been initialized to default values.",
      });
    },
    onError: () => {
      toast({
        title: "Initialization Failed",
        description: "Failed to initialize feature weights.",
        variant: "destructive",
      });
    },
  });

  const status = engineStatus?.status;
  const statsNeedRecalc = status?.populationStats?.needsRecalculation;
  const weightsConfigured = status?.featureWeights?.configured;

  return (
    <Card className="border-l-4 border-l-green-500" data-testid="statistical-learning-section">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Statistical Learning Configuration</CardTitle>
              <CardDescription>
                Enterprise-grade 62-feature system with database-backed population statistics
              </CardDescription>
            </div>
          </div>
          <Badge variant={statsNeedRecalc ? "destructive" : "default"}>
            {statsNeedRecalc ? "Needs Update" : "Ready"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {statusLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : status ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Features</span>
                </div>
                <p className="text-2xl font-bold">{status.featureCount}</p>
                <p className="text-xs text-muted-foreground">Unified analysis</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Population Stats</span>
                </div>
                <p className="text-2xl font-bold">{status.populationStats.count}</p>
                <p className="text-xs text-muted-foreground">
                  Coverage: {status.populationStats.coverage}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Feature Weights</span>
                </div>
                <p className="text-2xl font-bold">{status.featureWeights.count}</p>
                <p className="text-xs text-muted-foreground">
                  {status.featureWeights.note}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className={`h-4 w-4 ${status.systemReady ? 'text-green-500' : 'text-amber-500'}`} />
                  <span className="text-sm font-medium">System</span>
                </div>
                <p className="text-sm font-bold">{status.systemReady ? 'Ready' : 'Setup Required'}</p>
                <p className="text-xs text-muted-foreground">v2.0 Enterprise</p>
              </div>
            </div>

            <div>
              <h5 className="text-sm font-medium mb-2">Capabilities</h5>
              <div className="flex flex-wrap gap-1">
                {status.capabilities.map((cap, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">{cap}</Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => recalculateMutation.mutate()}
                disabled={recalculateMutation.isPending}
                data-testid="button-recalculate-stats"
              >
                {recalculateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Recalculate Statistics
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => initializeWeightsMutation.mutate()}
                disabled={initializeWeightsMutation.isPending}
                data-testid="button-initialize-weights"
              >
                {initializeWeightsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Settings2 className="h-4 w-4 mr-2" />
                )}
                Initialize Weights
              </Button>
              <Button
                variant={showStats ? "default" : "outline"}
                size="sm"
                onClick={() => setShowStats(!showStats)}
                data-testid="button-toggle-stats"
              >
                <Database className="h-4 w-4 mr-2" />
                {showStats ? "Hide" : "Show"} Population Stats
              </Button>
              <Button
                variant={showWeights ? "default" : "outline"}
                size="sm"
                onClick={() => setShowWeights(!showWeights)}
                data-testid="button-toggle-weights"
              >
                <Activity className="h-4 w-4 mr-2" />
                {showWeights ? "Hide" : "Show"} Feature Weights
              </Button>
            </div>

            {showStats && (
              <div className="mt-4">
                <h5 className="text-sm font-medium mb-2">Population Statistics (62 Features)</h5>
                {statsLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : populationStats?.statistics?.length ? (
                  <ScrollArea className="h-[300px] rounded-md border">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted">
                        <tr>
                          <th className="text-left p-2">Feature</th>
                          <th className="text-right p-2">Mean</th>
                          <th className="text-right p-2">Std Dev</th>
                          <th className="text-right p-2">P50</th>
                          <th className="text-right p-2">P90</th>
                          <th className="text-right p-2">Samples</th>
                        </tr>
                      </thead>
                      <tbody>
                        {populationStats.statistics.map((stat, idx) => (
                          <tr key={stat.id || idx} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-mono">{stat.featureName}</td>
                            <td className="text-right p-2 font-mono">{parseFloat(stat.mean).toFixed(2)}</td>
                            <td className="text-right p-2 font-mono">{parseFloat(stat.stdDev).toFixed(2)}</td>
                            <td className="text-right p-2 font-mono">{parseFloat(stat.percentile50).toFixed(2)}</td>
                            <td className="text-right p-2 font-mono">{parseFloat(stat.percentile90).toFixed(2)}</td>
                            <td className="text-right p-2">{stat.sampleSize}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No population statistics calculated yet</p>
                    <p className="text-xs">Click "Recalculate Statistics" to generate</p>
                  </div>
                )}
              </div>
            )}

            {showWeights && (
              <div className="mt-4">
                <h5 className="text-sm font-medium mb-2">Feature Weights (Supervised Scoring)</h5>
                {weightsLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : featureWeights?.weights?.length ? (
                  <ScrollArea className="h-[300px] rounded-md border">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted">
                        <tr>
                          <th className="text-left p-2">Feature</th>
                          <th className="text-left p-2">Category</th>
                          <th className="text-right p-2">Weight</th>
                          <th className="text-center p-2">Direction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {featureWeights.weights.map((weight, idx) => (
                          <tr key={weight.id || idx} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-mono">{weight.featureName}</td>
                            <td className="p-2">
                              <Badge variant="outline" className="text-xs capitalize">
                                {weight.category}
                              </Badge>
                            </td>
                            <td className="text-right p-2 font-mono">{parseFloat(weight.weight).toFixed(3)}</td>
                            <td className="text-center p-2">
                              {weight.direction === 'positive' ? (
                                <TrendingUp className="h-4 w-4 text-red-500 inline" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-green-500 inline" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No feature weights configured yet</p>
                    <p className="text-xs">Click "Initialize Weights" to set defaults</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Unable to load engine status</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Expandable 62-Feature Vector Component
function FeatureVectorExpanded() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const totalFeatures = Object.values(FEATURE_DEFINITIONS).reduce((sum, cat) => sum + cat.features.length, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 62-Feature Vector Card */}
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Layers className="h-4 w-4" />
            62-Feature Vector
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            {totalFeatures} features: 24 raw + 38 engineered from each claim
          </p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(CATEGORY_LABELS).map(([key, labels]) => {
              const category = FEATURE_DEFINITIONS[key as keyof typeof FEATURE_DEFINITIONS];
              const Icon = category.icon;
              return (
                <Badge
                  key={key}
                  variant="secondary"
                  className={`text-xs cursor-pointer hover-elevate ${expandedCategory === key ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}
                  data-testid={`badge-category-${key}`}
                >
                  <Icon className={`h-3 w-3 mr-1 ${category.color}`} />
                  {labels.en} ({category.features.length})
                </Badge>
              );
            })}
          </div>
        </div>
        
        {/* Temporal Windows Card */}
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Temporal Windows
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            Rolling aggregations for behavior tracking
          </p>
          <div className="flex flex-wrap gap-1">
            {["7-day", "30-day", "60-day", "90-day"].map((window) => (
              <Badge key={window} variant="outline" className="text-xs">{window}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Expanded Feature Details */}
      <Accordion 
        type="single" 
        collapsible 
        value={expandedCategory || undefined}
        onValueChange={(val) => setExpandedCategory(val || null)}
        className="w-full"
      >
        {Object.entries(FEATURE_DEFINITIONS).map(([categoryKey, category]) => {
          const labels = CATEGORY_LABELS[categoryKey as keyof typeof CATEGORY_LABELS];
          const Icon = category.icon;
          
          return (
            <AccordionItem key={categoryKey} value={categoryKey} className="border rounded-lg mb-2 px-2">
              <AccordionTrigger 
                className="hover:no-underline py-3"
                data-testid={`accordion-${categoryKey}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md bg-muted ${category.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{labels.en}</div>
                    <div className="text-xs text-muted-foreground">{labels.ar}</div>
                  </div>
                  <Badge variant="secondary" className="ml-2">{category.features.length} features</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pb-2">
                  {category.features.map((feature, idx) => (
                    <div 
                      key={feature.name}
                      className="p-3 bg-muted/50 rounded-md border border-border/50"
                      data-testid={`feature-${feature.name}`}
                    >
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <code className="text-xs font-mono text-primary block truncate" title={feature.name}>
                            {feature.name}
                          </code>
                          <p className="text-sm text-foreground mt-1">{feature.en}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 rtl:text-right" dir="rtl">
                            {feature.ar}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

function FeatureStoreSection({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const { data: stats, isLoading } = useQuery<FeatureStoreStats>({
    queryKey: ["/api/fwa/ml/stats"],
    refetchInterval: 30000,
  });

  const aggregateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/fwa/ml/aggregate-features");
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/ml/stats"] });
      toast({
        title: "Aggregation Complete",
        description: `Processed ${data.providersProcessed} providers and ${data.membersProcessed} members`,
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to aggregate features", variant: "destructive" });
    },
  });

  const trainMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/fwa/ml/train");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/ml/stats"] });
      toast({ title: "Training Complete", description: "ML models have been retrained" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to train models", variant: "destructive" });
    },
  });

  return (
    <Card className="mt-8" data-testid="card-feature-store">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-500" />
            ML Feature Store
          </CardTitle>
          <CardDescription>
            Entity profiles, peer baselines, and temporal aggregations for the 62-feature ML engine
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => aggregateMutation.mutate()}
            disabled={aggregateMutation.isPending}
            data-testid="button-aggregate-features"
          >
            {aggregateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Aggregate Features
          </Button>
          <Button
            variant="outline"
            onClick={() => trainMutation.mutate()}
            disabled={trainMutation.isPending}
            data-testid="button-train-models"
          >
            {trainMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Train Models
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 border rounded-lg bg-muted/30" data-testid="stat-providers">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Provider Profiles</span>
              </div>
              <div className="text-2xl font-bold">{stats?.featureStore?.providers || 0}</div>
              <p className="text-xs text-muted-foreground">Aggregated entities</p>
            </div>
            
            <div className="p-4 border rounded-lg bg-muted/30" data-testid="stat-members">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Member Profiles</span>
              </div>
              <div className="text-2xl font-bold">{stats?.featureStore?.members || 0}</div>
              <p className="text-xs text-muted-foreground">Patient aggregations</p>
            </div>
            
            <div className="p-4 border rounded-lg bg-muted/30" data-testid="stat-baselines">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Peer Baselines</span>
              </div>
              <div className="text-2xl font-bold">{stats?.peerBaselines || 0}</div>
              <p className="text-xs text-muted-foreground">Specialty benchmarks</p>
            </div>
            
            <div className="p-4 border rounded-lg bg-muted/30" data-testid="stat-inferences">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Inferences</span>
              </div>
              <div className="text-2xl font-bold">{stats?.inference?.totalAnalyzed || 0}</div>
              <p className="text-xs text-muted-foreground">Claims analyzed</p>
            </div>
            
            <div className="p-4 border rounded-lg bg-muted/30" data-testid="stat-patterns">
              <div className="flex items-center gap-2 mb-2">
                <Network className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Learned Patterns</span>
              </div>
              <div className="text-2xl font-bold">{stats?.learnedPatterns || 0}</div>
              <p className="text-xs text-muted-foreground">Detected anomalies</p>
            </div>
          </div>
        )}
        
        <Separator className="my-4" />
        
        <FeatureVectorExpanded />
      </CardContent>
    </Card>
  );
}

interface WeightProposal {
  id: string;
  detectionMethod: string;
  currentWeight: string;
  proposedWeight: string;
  weightDelta: string;
  feedbackCount: number;
  acceptanceRate: string;
  overrideRate: string;
  rationale: string;
  status: string;
}

function WeightProposalsSection({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const { data: proposals = [], isLoading } = useQuery<WeightProposal[]>({
    queryKey: ["/api/weight-proposals"],
    refetchInterval: 30000,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/weight-proposals/generate", {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/weight-proposals"] });
      toast({
        title: "Proposals Generated",
        description: `${data.proposalsGenerated} weight adjustment proposals created`,
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate proposals", variant: "destructive" });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      const response = await apiRequest("POST", `/api/weight-proposals/${id}/apply`, { action });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weight-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/detection/configs"] });
      toast({ title: "Success", description: "Weight proposal processed" });
    },
  });

  const pendingProposals = proposals.filter((p) => p.status === "pending");

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            AI Weight Adjustment Proposals
          </CardTitle>
          <CardDescription>
            Automated suggestions based on RLHF feedback patterns
          </CardDescription>
        </div>
        <Button
          variant="outline"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          data-testid="button-generate-proposals"
        >
          {generateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Generate Proposals
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pendingProposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Sparkles className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">No pending weight proposals</p>
            <p className="text-xs">Generate proposals based on RLHF feedback</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {pendingProposals.map((proposal) => {
                const Icon = methodIcons[proposal.detectionMethod] || Brain;
                const colorClass = methodColors[proposal.detectionMethod] || "text-gray-500";
                const currentWeight = parseFloat(proposal.currentWeight) * 100;
                const proposedWeight = parseFloat(proposal.proposedWeight) * 100;
                const isIncrease = proposedWeight > currentWeight;

                return (
                  <div
                    key={proposal.id}
                    className="p-4 border rounded-lg bg-muted/50"
                    data-testid={`proposal-${proposal.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-background ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm capitalize">
                            {proposal.detectionMethod.replace(/_/g, " ")}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Based on {proposal.feedbackCount} feedback samples</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => applyMutation.mutate({ id: proposal.id, action: "reject" })}
                          disabled={applyMutation.isPending}
                          data-testid={`button-reject-${proposal.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => applyMutation.mutate({ id: proposal.id, action: "approve" })}
                          disabled={applyMutation.isPending}
                          data-testid={`button-approve-${proposal.id}`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Apply
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Current:</span>
                        <Badge variant="outline" className="font-mono">{currentWeight.toFixed(0)}%</Badge>
                      </div>
                      {isIncrease ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Proposed:</span>
                        <Badge className={`font-mono ${isIncrease ? "bg-green-500" : "bg-red-500"}`}>
                          {proposedWeight.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Acceptance Rate: </span>
                        <span className="font-medium text-green-600">{parseFloat(proposal.acceptanceRate).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Override Rate: </span>
                        <span className="font-medium text-red-600">{parseFloat(proposal.overrideRate).toFixed(1)}%</span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground italic">{proposal.rationale}</p>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
