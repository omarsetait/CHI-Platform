import { db } from "../db";
import { detectionThresholds } from "@shared/schema";
import { eq } from "drizzle-orm";

interface ThresholdConfig {
  warningThreshold: number;
  criticalThreshold: number;
  isActive: boolean;
}

interface AllThresholds {
  provider: {
    deviationWarning: number;
    deviationCritical: number;
    flaggedClaimsWarning: number;
    flaggedClaimsCritical: number;
    weekendRatioMultiplier: number;
  };
  doctor: {
    procedureDeviationWarning: number;
    procedureDeviationCritical: number;
    patientVolumeDeviationWarning: number;
    patientVolumeDeviationCritical: number;
    flaggedClaimsWarning: number;
    flaggedClaimsCritical: number;
  };
  patient: {
    utilizationRatioWarning: number;
    utilizationRatioCritical: number;
    flaggedClaimsWarning: number;
    flaggedClaimsCritical: number;
  };
  statistical: {
    zscoreWarning: number;
    zscoreCritical: number;
  };
  unsupervised: {
    anomalyScoreWarning: number;
    anomalyScoreCritical: number;
  };
}

const DEFAULT_THRESHOLDS: AllThresholds = {
  provider: {
    deviationWarning: 0.5,
    deviationCritical: 1.0,
    flaggedClaimsWarning: 0.2,
    flaggedClaimsCritical: 0.4,
    weekendRatioMultiplier: 3.0,
  },
  doctor: {
    procedureDeviationWarning: 2.0,
    procedureDeviationCritical: 4.0,
    patientVolumeDeviationWarning: 1.0,
    patientVolumeDeviationCritical: 2.0,
    flaggedClaimsWarning: 0.15,
    flaggedClaimsCritical: 0.35,
  },
  patient: {
    utilizationRatioWarning: 3.0,
    utilizationRatioCritical: 5.0,
    flaggedClaimsWarning: 0.25,
    flaggedClaimsCritical: 0.45,
  },
  statistical: {
    zscoreWarning: 2.0,
    zscoreCritical: 3.0,
  },
  unsupervised: {
    anomalyScoreWarning: 0.5,
    anomalyScoreCritical: 0.75,
  }
};

let thresholdCache: AllThresholds | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 60000;

export async function getDetectionThresholds(): Promise<AllThresholds> {
  const now = Date.now();
  if (thresholdCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return thresholdCache;
  }

  try {
    const dbThresholds = await db.select().from(detectionThresholds).where(eq(detectionThresholds.isActive, true));
    
    if (dbThresholds.length === 0) {
      console.warn("[DetectionThresholds] WARNING: No thresholds in database, using emergency fallback defaults. Run seedDetectionThresholds() to populate database.");
      thresholdCache = DEFAULT_THRESHOLDS;
      cacheTimestamp = now;
      return DEFAULT_THRESHOLDS;
    }

    const result: AllThresholds = JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS));

    for (const t of dbThresholds) {
      const warning = parseFloat(t.warningThreshold || "0");
      const critical = parseFloat(t.criticalThreshold || "0");

      switch (t.thresholdKey) {
        case "provider_deviation":
          result.provider.deviationWarning = warning;
          result.provider.deviationCritical = critical;
          break;
        case "provider_flagged_claims":
          result.provider.flaggedClaimsWarning = warning;
          result.provider.flaggedClaimsCritical = critical;
          break;
        case "provider_weekend_ratio":
          result.provider.weekendRatioMultiplier = warning;
          break;
        case "doctor_procedure_deviation":
          result.doctor.procedureDeviationWarning = warning;
          result.doctor.procedureDeviationCritical = critical;
          break;
        case "doctor_patient_volume":
          result.doctor.patientVolumeDeviationWarning = warning;
          result.doctor.patientVolumeDeviationCritical = critical;
          break;
        case "doctor_flagged_claims":
          result.doctor.flaggedClaimsWarning = warning;
          result.doctor.flaggedClaimsCritical = critical;
          break;
        case "patient_utilization_ratio":
          result.patient.utilizationRatioWarning = warning;
          result.patient.utilizationRatioCritical = critical;
          break;
        case "patient_flagged_claims":
          result.patient.flaggedClaimsWarning = warning;
          result.patient.flaggedClaimsCritical = critical;
          break;
        case "statistical_zscore":
          result.statistical.zscoreWarning = warning;
          result.statistical.zscoreCritical = critical;
          break;
        case "unsupervised_anomaly_score":
          result.unsupervised.anomalyScoreWarning = warning;
          result.unsupervised.anomalyScoreCritical = critical;
          break;
      }
    }

    thresholdCache = result;
    cacheTimestamp = now;
    return result;
  } catch (error) {
    console.error("[Thresholds] Error loading from database, using defaults:", error);
    return DEFAULT_THRESHOLDS;
  }
}

export function invalidateThresholdCache(): void {
  thresholdCache = null;
  cacheTimestamp = 0;
}

export async function seedDetectionThresholds(): Promise<void> {
  const existingCount = await db.select().from(detectionThresholds);
  if (existingCount.length > 0) {
    console.log("[Seeder] Detection thresholds already exist, skipping");
    return;
  }

  const thresholdSeeds = [
    {
      thresholdKey: "provider_deviation",
      category: "rule_engine",
      entityType: "provider",
      warningThreshold: "0.5",
      criticalThreshold: "1.0",
      displayName: "Provider Billing Deviation",
      displayNameAr: "انحراف فواتير مقدم الخدمة",
      description: "Threshold for flagging provider billing deviations from peer average",
      descriptionAr: "حد انحراف الفواتير عن متوسط الأقران",
      unit: "ratio",
      priority: 100
    },
    {
      thresholdKey: "provider_flagged_claims",
      category: "rule_engine",
      entityType: "provider",
      warningThreshold: "0.2",
      criticalThreshold: "0.4",
      displayName: "Provider Flagged Claims Rate",
      displayNameAr: "معدل المطالبات المرفوضة للمقدم",
      description: "Percentage of flagged claims threshold for providers",
      descriptionAr: "نسبة المطالبات المرفوضة لمقدمي الخدمات",
      unit: "percentage",
      priority: 100
    },
    {
      thresholdKey: "provider_weekend_ratio",
      category: "rule_engine",
      entityType: "provider",
      warningThreshold: "3.0",
      criticalThreshold: "5.0",
      displayName: "Weekend Billing Multiplier",
      displayNameAr: "مضاعف فواتير نهاية الأسبوع",
      description: "Multiplier above expected weekend ratio to flag",
      descriptionAr: "المضاعف فوق نسبة نهاية الأسبوع المتوقعة",
      unit: "multiplier",
      priority: 90
    },
    {
      thresholdKey: "doctor_procedure_deviation",
      category: "rule_engine",
      entityType: "doctor",
      warningThreshold: "2.0",
      criticalThreshold: "4.0",
      displayName: "Doctor Procedure Frequency Deviation",
      displayNameAr: "انحراف تكرار إجراءات الطبيب",
      description: "Threshold for flagging doctor procedure frequency anomalies",
      descriptionAr: "حد انحراف تكرار الإجراءات للأطباء",
      unit: "ratio",
      priority: 100
    },
    {
      thresholdKey: "doctor_patient_volume",
      category: "rule_engine",
      entityType: "doctor",
      warningThreshold: "1.0",
      criticalThreshold: "2.0",
      displayName: "Doctor Patient Volume Deviation",
      displayNameAr: "انحراف حجم مرضى الطبيب",
      description: "Threshold for flagging doctor patient volume anomalies",
      descriptionAr: "حد انحراف حجم المرضى للأطباء",
      unit: "ratio",
      priority: 100
    },
    {
      thresholdKey: "doctor_flagged_claims",
      category: "rule_engine",
      entityType: "doctor",
      warningThreshold: "0.15",
      criticalThreshold: "0.35",
      displayName: "Doctor Flagged Claims Rate",
      displayNameAr: "معدل المطالبات المرفوضة للطبيب",
      description: "Percentage of flagged claims threshold for doctors",
      descriptionAr: "نسبة المطالبات المرفوضة للأطباء",
      unit: "percentage",
      priority: 100
    },
    {
      thresholdKey: "patient_utilization_ratio",
      category: "rule_engine",
      entityType: "patient",
      warningThreshold: "3.0",
      criticalThreshold: "5.0",
      displayName: "Patient Utilization Ratio",
      displayNameAr: "نسبة استخدام المريض",
      description: "Threshold for flagging patient utilization anomalies",
      descriptionAr: "حد انحراف استخدام المريض",
      unit: "ratio",
      priority: 100
    },
    {
      thresholdKey: "patient_flagged_claims",
      category: "rule_engine",
      entityType: "patient",
      warningThreshold: "0.25",
      criticalThreshold: "0.45",
      displayName: "Patient Flagged Claims Rate",
      displayNameAr: "معدل المطالبات المرفوضة للمريض",
      description: "Percentage of flagged claims threshold for patients",
      descriptionAr: "نسبة المطالبات المرفوضة للمرضى",
      unit: "percentage",
      priority: 100
    },
    {
      thresholdKey: "statistical_zscore",
      category: "statistical",
      entityType: null,
      warningThreshold: "2.0",
      criticalThreshold: "3.0",
      displayName: "Statistical Z-Score Threshold",
      displayNameAr: "حد Z-Score الإحصائي",
      description: "Z-score threshold for flagging statistical anomalies",
      descriptionAr: "حد Z-Score للكشف عن الانحرافات الإحصائية",
      unit: "zscore",
      priority: 100
    },
    {
      thresholdKey: "unsupervised_anomaly_score",
      category: "unsupervised",
      entityType: null,
      warningThreshold: "0.5",
      criticalThreshold: "0.75",
      displayName: "Unsupervised Anomaly Score",
      displayNameAr: "درجة الشذوذ غير المُشرف عليها",
      description: "Anomaly score threshold for unsupervised detection",
      descriptionAr: "حد درجة الشذوذ للكشف غير المُشرف عليه",
      unit: "score",
      priority: 100
    }
  ];

  for (const seed of thresholdSeeds) {
    await db.insert(detectionThresholds).values(seed);
  }

  console.log(`[Seeder] Seeded ${thresholdSeeds.length} detection thresholds`);
}

export { AllThresholds };
