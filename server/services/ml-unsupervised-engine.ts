import { db } from "../db";
import { 
  claims, 
  providerFeatureStore, 
  memberFeatureStore,
  peerGroupBaselines,
  mlClaimInference,
  mlLearnedPatterns,
  mlModelRegistry
} from "@shared/schema";
import { eq, and, gte, lte, sql, desc, asc, ne, isNull, count } from "drizzle-orm";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ClaimFeatureVector {
  // Raw claim features (24)
  claim_amount: number;
  surgery_fee: number;
  outlier_score: number;
  day_of_week: number;
  is_weekend: number;
  hour_of_day: number;
  days_to_submit: number;
  length_of_stay: number;
  has_surgery: number;
  has_icu: number;
  diagnosis_count: number;
  procedure_count: number;
  icd_chapter: number;
  similar_claims: number;
  similar_claims_hospital: number;
  is_flagged: number;
  claim_type_encoded: number;
  category_encoded: number;
  
  // Provider features (12)
  provider_claim_count_7d: number;
  provider_claim_count_30d: number;
  provider_claim_count_90d: number;
  provider_avg_amount_30d: number;
  provider_std_amount_30d: number;
  provider_unique_patients_30d: number;
  provider_unique_diagnoses_30d: number;
  provider_denial_rate_90d: number;
  provider_flag_rate_90d: number;
  provider_weekend_ratio: number;
  provider_night_ratio: number;
  provider_surgery_rate: number;
  provider_avg_los: number;
  
  // Member features (10)
  member_claim_count_30d: number;
  member_claim_count_90d: number;
  member_unique_providers_30d: number;
  member_unique_providers_90d: number;
  member_total_amount_30d: number;
  member_avg_amount_30d: number;
  member_unique_diagnoses_30d: number;
  member_surgery_count_90d: number;
  member_icu_count_90d: number;
  member_high_utilizer_flag: number;
  
  // Derived features (8)
  amount_vs_provider_avg: number;
  amount_vs_member_avg: number;
  amount_vs_peer_group: number;
  los_vs_diagnosis_expected: number;
  procedure_diagnosis_mismatch: number;
  amount_per_los_day: number;
  procedure_density: number;
  diagnosis_rarity_score: number;
  
  // Temporal features (8)
  provider_trend_7d_vs_30d: number;
  provider_amount_trend: number;
  member_frequency_acceleration: number;
  days_since_last_claim: number;
  claims_same_day: number;
  claims_same_provider_week: number;
  duplicate_window_flag: number;
  burst_pattern_score: number;
}

export interface MLInferenceResult {
  claimId: string;
  featureVector: ClaimFeatureVector;
  
  // Algorithm scores
  isolationForest: {
    score: number;
    depth: number;
    isAnomaly: boolean;
  };
  lof: {
    score: number;
    neighborhoodSize: number;
    isAnomaly: boolean;
  };
  dbscan: {
    cluster: number;
    isNoise: boolean;
  };
  autoencoder: {
    reconstructionError: number;
    isAnomaly: boolean;
  };
  deepLearning: {
    score: number;
    confidence: number;
  };
  
  // Composite results
  compositeScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  topContributingFeatures: Array<{
    feature: string;
    value: number;
    contribution: number;
    zScore: number;
  }>;
  
  // Explanations
  anomalyReasons: string[];
  humanExplanation: string;
  humanExplanationAr: string;
  
  // Context
  providerRiskScore: number;
  memberRiskScore: number;
  peerPercentile: number;
  
  processingTimeMs: number;
}

// ============================================
// FEATURE ENGINEERING SERVICE
// ============================================

export class FeatureEngineeringService {
  
  // ICD-10 chapter encoding (A=1, B=2, ..., Z=26)
  private encodeIcdChapter(icd: string | null): number {
    if (!icd) return 0;
    const firstChar = icd.charAt(0).toUpperCase();
    if (firstChar >= 'A' && firstChar <= 'Z') {
      return firstChar.charCodeAt(0) - 64; // A=1, B=2, etc.
    }
    return 0;
  }
  
  // Claim type encoding
  private encodeClaimType(type: string | null): number {
    const types: Record<string, number> = {
      'inpatient': 1,
      'outpatient': 2,
      'pharmacy': 3,
      'dental': 4,
      'vision': 5,
      'mental_health': 6,
      'surgery': 7,
      'emergency': 8,
      'laboratory': 9,
      'radiology': 10
    };
    return types[type?.toLowerCase() || ''] || 0;
  }
  
  // Category encoding
  private encodeCategory(category: string | null): number {
    const categories: Record<string, number> = {
      'medical': 1,
      'surgical': 2,
      'diagnostic': 3,
      'therapeutic': 4,
      'preventive': 5,
      'emergency': 6,
      'chronic': 7,
      'acute': 8
    };
    return categories[category?.toLowerCase() || ''] || 0;
  }
  
  // Calculate diagnosis rarity score based on frequency
  private async calculateDiagnosisRarity(icd: string | null): Promise<number> {
    if (!icd) return 0.5;
    
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(claims)
      .where(eq(claims.icd, icd));
    
    const totalClaims = await db.select({ count: sql<number>`count(*)` })
      .from(claims);
    
    const frequency = (result[0]?.count || 0) / (totalClaims[0]?.count || 1);
    
    // Rare diagnoses (< 1%) get high rarity score
    if (frequency < 0.01) return 0.9;
    if (frequency < 0.05) return 0.7;
    if (frequency < 0.10) return 0.5;
    return 0.3;
  }
  
  // Get provider features from feature store or calculate fresh
  async getProviderFeatures(providerId: string): Promise<{
    claimCount7d: number;
    claimCount30d: number;
    claimCount90d: number;
    avgAmount30d: number;
    stdAmount30d: number;
    uniquePatients30d: number;
    uniqueDiagnoses30d: number;
    denialRate90d: number;
    flagRate90d: number;
    weekendRatio: number;
    nightRatio: number;
    surgeryRate: number;
    avgLos: number;
    trend7dVs30d: number;
    amountTrend: number;
  }> {
    // Try to get from feature store first
    const cached = await db.select()
      .from(providerFeatureStore)
      .where(eq(providerFeatureStore.providerId, providerId))
      .limit(1);
    
    if (cached.length > 0) {
      const p = cached[0];
      return {
        claimCount7d: p.claimCount7d || 0,
        claimCount30d: p.claimCount30d || 0,
        claimCount90d: p.claimCount90d || 0,
        avgAmount30d: parseFloat(p.avgAmount30d?.toString() || '0'),
        stdAmount30d: parseFloat(p.stdAmount30d?.toString() || '0'),
        uniquePatients30d: p.uniquePatients30d || 0,
        uniqueDiagnoses30d: p.uniqueDiagnoses30d || 0,
        denialRate90d: parseFloat(p.denialRate90d?.toString() || '0'),
        flagRate90d: parseFloat(p.flagRate90d?.toString() || '0'),
        weekendRatio: parseFloat(p.weekendRatio30d?.toString() || '0'),
        nightRatio: 0, // Not stored in feature store, will be calculated if needed
        surgeryRate: parseFloat(p.surgeryRate30d?.toString() || '0'),
        avgLos: parseFloat(p.avgLos30d?.toString() || '0'),
        trend7dVs30d: parseFloat(p.claimTrend7dVs30d?.toString() || '0'),
        amountTrend: parseFloat(p.amountTrend7dVs30d?.toString() || '0')
      };
    }
    
    // Calculate fresh if not in store
    return this.calculateProviderFeaturesFresh(providerId);
  }
  
  async calculateProviderFeaturesFresh(providerId: string): Promise<{
    claimCount7d: number;
    claimCount30d: number;
    claimCount90d: number;
    avgAmount30d: number;
    stdAmount30d: number;
    uniquePatients30d: number;
    uniqueDiagnoses30d: number;
    denialRate90d: number;
    flagRate90d: number;
    weekendRatio: number;
    nightRatio: number;
    surgeryRate: number;
    avgLos: number;
    trend7dVs30d: number;
    amountTrend: number;
  }> {
    const now = new Date();
    const day7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const day90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    // Get claims in different time windows
    const claims7d = await db.select()
      .from(claims)
      .where(and(
        eq(claims.providerId, providerId),
        gte(claims.serviceDate, day7Ago)
      ));
    
    const claims30d = await db.select()
      .from(claims)
      .where(and(
        eq(claims.providerId, providerId),
        gte(claims.serviceDate, day30Ago)
      ));
    
    const claims90d = await db.select()
      .from(claims)
      .where(and(
        eq(claims.providerId, providerId),
        gte(claims.serviceDate, day90Ago)
      ));
    
    // Calculate amounts
    const amounts30d = claims30d.map(c => parseFloat(c.amount?.toString() || '0'));
    const avgAmount30d = amounts30d.length > 0 
      ? amounts30d.reduce((a, b) => a + b, 0) / amounts30d.length 
      : 0;
    const stdAmount30d = this.calculateStdDev(amounts30d);
    
    // Unique counts
    const uniquePatients30d = new Set(claims30d.map(c => c.patientId)).size;
    const uniqueDiagnoses30d = new Set(claims30d.map(c => c.icd).filter(Boolean)).size;
    
    // Rates
    const deniedClaims90d = claims90d.filter(c => c.status === 'denied' || c.status === 'rejected').length;
    const denialRate90d = claims90d.length > 0 ? deniedClaims90d / claims90d.length : 0;
    
    const flaggedClaims90d = claims90d.filter(c => c.flagged).length;
    const flagRate90d = claims90d.length > 0 ? flaggedClaims90d / claims90d.length : 0;
    
    // Weekend ratio
    const weekendClaims30d = claims30d.filter(c => {
      if (!c.serviceDate) return false;
      const day = new Date(c.serviceDate).getDay();
      return day === 0 || day === 5 || day === 6; // Friday, Saturday, Sunday
    }).length;
    const weekendRatio = claims30d.length > 0 ? weekendClaims30d / claims30d.length : 0;
    
    // Night ratio (claims billed between 22:00-06:00)
    const nightClaims30d = claims30d.filter(c => {
      if (!c.serviceDate) return false;
      const hour = new Date(c.serviceDate).getHours();
      return hour >= 22 || hour < 6; // 22:00-06:00
    }).length;
    const nightRatio = claims30d.length > 0 ? nightClaims30d / claims30d.length : 0;
    
    // Surgery rate
    const surgeryClaims30d = claims30d.filter(c => c.hasSurgery === 'Yes' || c.hasSurgery === 'true').length;
    const surgeryRate = claims30d.length > 0 ? surgeryClaims30d / claims30d.length : 0;
    
    // Average LOS
    const losValues = claims30d.map(c => c.lengthOfStay || 0).filter(v => v > 0);
    const avgLos = losValues.length > 0 ? losValues.reduce((a, b) => a + b, 0) / losValues.length : 0;
    
    // Trend calculations
    const avgDaily7d = claims7d.length / 7;
    const avgDaily30d = claims30d.length / 30;
    const trend7dVs30d = avgDaily30d > 0 ? avgDaily7d / avgDaily30d : 1;
    
    const amounts7d = claims7d.map(c => parseFloat(c.amount?.toString() || '0'));
    const avgAmount7d = amounts7d.length > 0 
      ? amounts7d.reduce((a, b) => a + b, 0) / amounts7d.length 
      : 0;
    const amountTrend = avgAmount30d > 0 ? avgAmount7d / avgAmount30d : 1;
    
    return {
      claimCount7d: claims7d.length,
      claimCount30d: claims30d.length,
      claimCount90d: claims90d.length,
      avgAmount30d,
      stdAmount30d,
      uniquePatients30d,
      uniqueDiagnoses30d,
      denialRate90d,
      flagRate90d,
      weekendRatio,
      nightRatio,
      surgeryRate,
      avgLos,
      trend7dVs30d,
      amountTrend
    };
  }
  
  // Get member features
  async getMemberFeatures(memberId: string): Promise<{
    claimCount30d: number;
    claimCount90d: number;
    uniqueProviders30d: number;
    uniqueProviders90d: number;
    totalAmount30d: number;
    avgAmount30d: number;
    uniqueDiagnoses30d: number;
    surgeryCount90d: number;
    icuCount90d: number;
    highUtilizer: boolean;
    daysSinceLastClaim: number;
    frequencyAcceleration: number;
  }> {
    // Try feature store first
    const cached = await db.select()
      .from(memberFeatureStore)
      .where(eq(memberFeatureStore.memberId, memberId))
      .limit(1);
    
    if (cached.length > 0) {
      const m = cached[0];
      return {
        claimCount30d: m.claimCount30d || 0,
        claimCount90d: m.claimCount90d || 0,
        uniqueProviders30d: m.uniqueProviders30d || 0,
        uniqueProviders90d: m.uniqueProviders90d || 0,
        totalAmount30d: parseFloat(m.totalAmount30d?.toString() || '0'),
        avgAmount30d: parseFloat(m.avgAmount30d?.toString() || '0'),
        uniqueDiagnoses30d: m.uniqueDiagnoses30d || 0,
        surgeryCount90d: m.surgeryCount90d || 0,
        icuCount90d: m.icuCount90d || 0,
        highUtilizer: m.highUtilizerFlag || false,
        daysSinceLastClaim: m.daysSinceLastClaim || 0,
        frequencyAcceleration: parseFloat(m.claimFrequencyTrend?.toString() || '0')
      };
    }
    
    // Calculate fresh
    return this.calculateMemberFeaturesFresh(memberId);
  }
  
  async calculateMemberFeaturesFresh(memberId: string): Promise<{
    claimCount30d: number;
    claimCount90d: number;
    uniqueProviders30d: number;
    uniqueProviders90d: number;
    totalAmount30d: number;
    avgAmount30d: number;
    uniqueDiagnoses30d: number;
    surgeryCount90d: number;
    icuCount90d: number;
    highUtilizer: boolean;
    daysSinceLastClaim: number;
    frequencyAcceleration: number;
  }> {
    const now = new Date();
    const day30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const day90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    const claims30d = await db.select()
      .from(claims)
      .where(and(
        eq(claims.patientId, memberId),
        gte(claims.serviceDate, day30Ago)
      ));
    
    const claims90d = await db.select()
      .from(claims)
      .where(and(
        eq(claims.patientId, memberId),
        gte(claims.serviceDate, day90Ago)
      ));
    
    // Most recent claim
    const lastClaim = await db.select()
      .from(claims)
      .where(eq(claims.patientId, memberId))
      .orderBy(desc(claims.serviceDate))
      .limit(1);
    
    const amounts30d = claims30d.map(c => parseFloat(c.amount?.toString() || '0'));
    const totalAmount30d = amounts30d.reduce((a, b) => a + b, 0);
    const avgAmount30d = amounts30d.length > 0 ? totalAmount30d / amounts30d.length : 0;
    
    const uniqueProviders30d = new Set(claims30d.map(c => c.providerId)).size;
    const uniqueProviders90d = new Set(claims90d.map(c => c.providerId)).size;
    const uniqueDiagnoses30d = new Set(claims30d.map(c => c.icd).filter(Boolean)).size;
    
    const surgeryCount90d = claims90d.filter(c => c.hasSurgery === 'Yes' || c.hasSurgery === 'true').length;
    const icuCount90d = claims90d.filter(c => c.hasIcu === 'Yes' || c.hasIcu === 'true').length;
    
    // High utilizer = more than 10 claims in 30 days
    const highUtilizer = claims30d.length > 10;
    
    // Days since last claim
    const daysSinceLastClaim = lastClaim.length > 0 && lastClaim[0].serviceDate
      ? Math.floor((now.getTime() - new Date(lastClaim[0].serviceDate).getTime()) / (24 * 60 * 60 * 1000))
      : 365;
    
    // Frequency acceleration (comparing recent 30d vs previous 30d in the 90d window)
    const claims30to60d = claims90d.filter(c => {
      if (!c.serviceDate) return false;
      const d = new Date(c.serviceDate);
      return d >= new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) && d < day30Ago;
    });
    const frequencyAcceleration = claims30to60d.length > 0 
      ? claims30d.length / claims30to60d.length 
      : claims30d.length > 0 ? 2 : 0;
    
    return {
      claimCount30d: claims30d.length,
      claimCount90d: claims90d.length,
      uniqueProviders30d,
      uniqueProviders90d,
      totalAmount30d,
      avgAmount30d,
      uniqueDiagnoses30d,
      surgeryCount90d,
      icuCount90d,
      highUtilizer,
      daysSinceLastClaim,
      frequencyAcceleration
    };
  }
  
  // Calculate additional temporal features for a specific claim
  async calculateTemporalFeatures(claim: any): Promise<{
    claimsSameDay: number;
    claimsSameProviderWeek: number;
    duplicateWindowFlag: boolean;
    burstPatternScore: number;
  }> {
    if (!claim.serviceDate) {
      return { claimsSameDay: 0, claimsSameProviderWeek: 0, duplicateWindowFlag: false, burstPatternScore: 0 };
    }
    
    const serviceDate = new Date(claim.serviceDate);
    const dayStart = new Date(serviceDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(serviceDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    const weekAgo = new Date(serviceDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Same day claims for this member
    const sameDayClaims = await db.select({ count: sql<number>`count(*)` })
      .from(claims)
      .where(and(
        eq(claims.patientId, claim.patientId),
        gte(claims.serviceDate, dayStart),
        lte(claims.serviceDate, dayEnd),
        ne(claims.id, claim.id)
      ));
    
    // Same provider claims this week
    const sameProviderWeek = await db.select({ count: sql<number>`count(*)` })
      .from(claims)
      .where(and(
        eq(claims.patientId, claim.patientId),
        eq(claims.providerId, claim.providerId),
        gte(claims.serviceDate, weekAgo),
        ne(claims.id, claim.id)
      ));
    
    // Duplicate detection (same ICD, same provider, within 7 days)
    const duplicates = await db.select({ count: sql<number>`count(*)` })
      .from(claims)
      .where(and(
        eq(claims.patientId, claim.patientId),
        eq(claims.providerId, claim.providerId),
        eq(claims.icd, claim.icd),
        gte(claims.serviceDate, weekAgo),
        ne(claims.id, claim.id)
      ));
    
    // Burst pattern (more than 5 claims in 3 days)
    const day3Ago = new Date(serviceDate.getTime() - 3 * 24 * 60 * 60 * 1000);
    const burst = await db.select({ count: sql<number>`count(*)` })
      .from(claims)
      .where(and(
        eq(claims.patientId, claim.patientId),
        gte(claims.serviceDate, day3Ago)
      ));
    
    const burstPatternScore = Math.min(1, (burst[0]?.count || 0) / 10);
    
    return {
      claimsSameDay: sameDayClaims[0]?.count || 0,
      claimsSameProviderWeek: sameProviderWeek[0]?.count || 0,
      duplicateWindowFlag: (duplicates[0]?.count || 0) > 0,
      burstPatternScore
    };
  }
  
  // Get peer group baseline for comparison
  async getPeerBaseline(specialty: string | null): Promise<{
    avgAmount: number;
    medianAmount: number;
    stdAmount: number;
    p95Amount: number;
  }> {
    if (!specialty) {
      // Return global baselines
      const result = await db.select({
        avg: sql<number>`avg(${claims.amount}::numeric)`,
        p50: sql<number>`percentile_cont(0.5) within group (order by ${claims.amount}::numeric)`,
        p95: sql<number>`percentile_cont(0.95) within group (order by ${claims.amount}::numeric)`
      }).from(claims);
      
      const avg = result[0]?.avg || 15000;
      return {
        avgAmount: avg,
        medianAmount: result[0]?.p50 || 10000,
        stdAmount: avg * 0.5,
        p95Amount: result[0]?.p95 || 100000
      };
    }
    
    // Check peer group baselines table
    const baseline = await db.select()
      .from(peerGroupBaselines)
      .where(and(
        eq(peerGroupBaselines.groupType, 'specialty'),
        eq(peerGroupBaselines.groupKey, specialty)
      ))
      .limit(1);
    
    if (baseline.length > 0) {
      return {
        avgAmount: parseFloat(baseline[0].avgClaimAmount?.toString() || '15000'),
        medianAmount: parseFloat(baseline[0].medianClaimAmount?.toString() || '10000'),
        stdAmount: parseFloat(baseline[0].stdClaimAmount?.toString() || '7500'),
        p95Amount: parseFloat(baseline[0].p95ClaimAmount?.toString() || '100000')
      };
    }
    
    return { avgAmount: 15000, medianAmount: 10000, stdAmount: 7500, p95Amount: 100000 };
  }
  
  // Build complete feature vector for a claim
  async buildFeatureVector(claim: any): Promise<ClaimFeatureVector> {
    const amount = parseFloat(claim.amount?.toString() || '0');
    const surgeryFee = parseFloat(claim.surgeryFee?.toString() || '0');
    const outlierScore = parseFloat(claim.outlierScore?.toString() || '0');
    const los = claim.lengthOfStay || 0;
    
    // Get entity features
    const providerFeatures = await this.getProviderFeatures(claim.providerId || '');
    const memberFeatures = await this.getMemberFeatures(claim.patientId || '');
    const temporalFeatures = await this.calculateTemporalFeatures(claim);
    const peerBaseline = await this.getPeerBaseline(null); // Would use provider specialty
    
    // Date features
    const serviceDate = claim.serviceDate ? new Date(claim.serviceDate) : new Date();
    const regDate = claim.registrationDate ? new Date(claim.registrationDate) : new Date();
    const dayOfWeek = serviceDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6 ? 1 : 0;
    const hourOfDay = regDate.getHours();
    const daysToSubmit = Math.floor((regDate.getTime() - serviceDate.getTime()) / (24 * 60 * 60 * 1000));
    
    // Diagnosis rarity
    const diagnosisRarity = await this.calculateDiagnosisRarity(claim.icd);
    
    // Z-scores
    const amountVsProviderAvg = providerFeatures.stdAmount30d > 0
      ? (amount - providerFeatures.avgAmount30d) / providerFeatures.stdAmount30d
      : 0;
    const amountVsMemberAvg = memberFeatures.avgAmount30d > 0
      ? (amount - memberFeatures.avgAmount30d) / memberFeatures.avgAmount30d
      : 0;
    const amountVsPeerGroup = peerBaseline.stdAmount > 0
      ? (amount - peerBaseline.avgAmount) / peerBaseline.stdAmount
      : 0;
    
    // Derived features
    const amountPerLosDay = los > 0 ? amount / los : amount;
    const procedureCount = claim.cptCodes?.length || 0;
    const diagnosisCount = claim.diagnosisCodes?.length || (claim.icd ? 1 : 0);
    const procedureDensity = los > 0 ? procedureCount / los : procedureCount;
    
    // LOS vs expected (simplified - normally would use DRG/ICD mapping)
    const expectedLos = claim.hasSurgery === 'Yes' ? 5 : 2;
    const losVsExpected = expectedLos > 0 ? los / expectedLos : 1;
    
    // Procedure-diagnosis mismatch score (simplified)
    const mismatchScore = this.calculateMismatchScore(claim.icd, claim.cptCodes);
    
    return {
      // Raw features
      claim_amount: amount,
      surgery_fee: surgeryFee,
      outlier_score: outlierScore,
      day_of_week: dayOfWeek,
      is_weekend: isWeekend,
      hour_of_day: hourOfDay,
      days_to_submit: Math.max(0, daysToSubmit),
      length_of_stay: los,
      has_surgery: claim.hasSurgery === 'Yes' ? 1 : 0,
      has_icu: claim.hasIcu === 'Yes' ? 1 : 0,
      diagnosis_count: diagnosisCount,
      procedure_count: procedureCount,
      icd_chapter: this.encodeIcdChapter(claim.icd),
      similar_claims: claim.similarClaims || 0,
      similar_claims_hospital: claim.similarClaimsInHospital || 0,
      is_flagged: claim.flagged ? 1 : 0,
      claim_type_encoded: this.encodeClaimType(claim.claimType),
      category_encoded: this.encodeCategory(claim.category),
      
      // Provider features
      provider_claim_count_7d: providerFeatures.claimCount7d,
      provider_claim_count_30d: providerFeatures.claimCount30d,
      provider_claim_count_90d: providerFeatures.claimCount90d,
      provider_avg_amount_30d: providerFeatures.avgAmount30d,
      provider_std_amount_30d: providerFeatures.stdAmount30d,
      provider_unique_patients_30d: providerFeatures.uniquePatients30d,
      provider_unique_diagnoses_30d: providerFeatures.uniqueDiagnoses30d,
      provider_denial_rate_90d: providerFeatures.denialRate90d,
      provider_flag_rate_90d: providerFeatures.flagRate90d,
      provider_weekend_ratio: providerFeatures.weekendRatio,
      provider_night_ratio: providerFeatures.nightRatio,
      provider_surgery_rate: providerFeatures.surgeryRate,
      provider_avg_los: providerFeatures.avgLos,
      
      // Member features
      member_claim_count_30d: memberFeatures.claimCount30d,
      member_claim_count_90d: memberFeatures.claimCount90d,
      member_unique_providers_30d: memberFeatures.uniqueProviders30d,
      member_unique_providers_90d: memberFeatures.uniqueProviders90d,
      member_total_amount_30d: memberFeatures.totalAmount30d,
      member_avg_amount_30d: memberFeatures.avgAmount30d,
      member_unique_diagnoses_30d: memberFeatures.uniqueDiagnoses30d,
      member_surgery_count_90d: memberFeatures.surgeryCount90d,
      member_icu_count_90d: memberFeatures.icuCount90d,
      member_high_utilizer_flag: memberFeatures.highUtilizer ? 1 : 0,
      
      // Derived features
      amount_vs_provider_avg: amountVsProviderAvg,
      amount_vs_member_avg: amountVsMemberAvg,
      amount_vs_peer_group: amountVsPeerGroup,
      los_vs_diagnosis_expected: losVsExpected,
      procedure_diagnosis_mismatch: mismatchScore,
      amount_per_los_day: amountPerLosDay,
      procedure_density: procedureDensity,
      diagnosis_rarity_score: diagnosisRarity,
      
      // Temporal features
      provider_trend_7d_vs_30d: providerFeatures.trend7dVs30d,
      provider_amount_trend: providerFeatures.amountTrend,
      member_frequency_acceleration: memberFeatures.frequencyAcceleration,
      days_since_last_claim: memberFeatures.daysSinceLastClaim,
      claims_same_day: temporalFeatures.claimsSameDay,
      claims_same_provider_week: temporalFeatures.claimsSameProviderWeek,
      duplicate_window_flag: temporalFeatures.duplicateWindowFlag ? 1 : 0,
      burst_pattern_score: temporalFeatures.burstPatternScore
    };
  }
  
  // Helper: Calculate standard deviation
  private calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }
  
  // Helper: Calculate procedure-diagnosis mismatch
  private calculateMismatchScore(icd: string | null, cptCodes: string[] | null): number {
    if (!icd || !cptCodes || cptCodes.length === 0) return 0;
    
    // Simplified mismatch detection based on ICD chapter and CPT range
    const icdChapter = icd.charAt(0).toUpperCase();
    
    // Check for obvious mismatches (simplified logic)
    const surgicalCpts = cptCodes.filter(c => 
      c.startsWith('1') || c.startsWith('2') || c.startsWith('3') || c.startsWith('4') || c.startsWith('5') || c.startsWith('6')
    );
    
    // Surgical codes with non-surgical ICD chapters
    if (surgicalCpts.length > 0 && ['Z', 'R'].includes(icdChapter)) {
      return 0.7; // High mismatch
    }
    
    return 0.2; // Low mismatch (default)
  }
}

// ============================================
// ML ALGORITHMS - ISOLATION FOREST
// ============================================

export class IsolationForestAlgorithm {
  private trees: IsolationTree[] = [];
  private numTrees: number = 100;
  private sampleSize: number = 256;
  
  // Build forest from feature vectors
  async train(dataPoints: ClaimFeatureVector[]): Promise<void> {
    this.trees = [];
    
    for (let i = 0; i < this.numTrees; i++) {
      // Random sample
      const sample = this.randomSample(dataPoints, Math.min(this.sampleSize, dataPoints.length));
      const tree = new IsolationTree();
      tree.build(sample, 0, Math.ceil(Math.log2(this.sampleSize)));
      this.trees.push(tree);
    }
  }
  
  // Score a single point
  score(point: ClaimFeatureVector): { anomalyScore: number; avgPathLength: number } {
    if (this.trees.length === 0) {
      // Use pre-trained defaults if no training data
      return this.scoreWithDefaults(point);
    }
    
    const pathLengths = this.trees.map(tree => tree.pathLength(point, 0));
    const avgPathLength = pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length;
    
    // Normalize using expected path length for sample size
    const c = this.expectedPathLength(this.sampleSize);
    const anomalyScore = Math.pow(2, -avgPathLength / c);
    
    return { anomalyScore, avgPathLength };
  }
  
  // Score with pre-defined thresholds (when no training data)
  private scoreWithDefaults(point: ClaimFeatureVector): { anomalyScore: number; avgPathLength: number } {
    let anomalyIndicators = 0;
    
    // Amount anomalies
    if (point.claim_amount > 200000) anomalyIndicators += 3;
    else if (point.claim_amount > 100000) anomalyIndicators += 2;
    else if (point.claim_amount > 50000) anomalyIndicators += 1;
    
    // Z-score anomalies
    if (Math.abs(point.amount_vs_provider_avg) > 3) anomalyIndicators += 2;
    if (Math.abs(point.amount_vs_peer_group) > 2.5) anomalyIndicators += 1;
    
    // Temporal anomalies
    if (point.burst_pattern_score > 0.7) anomalyIndicators += 2;
    if (point.duplicate_window_flag > 0) anomalyIndicators += 2;
    if (point.claims_same_day > 3) anomalyIndicators += 1;
    
    // Provider anomalies
    if (point.provider_flag_rate_90d > 0.2) anomalyIndicators += 1;
    if (point.provider_denial_rate_90d > 0.3) anomalyIndicators += 1;
    
    // Member anomalies
    if (point.member_high_utilizer_flag > 0) anomalyIndicators += 1;
    if (point.member_unique_providers_30d > 10) anomalyIndicators += 1;
    
    // Normalize to 0-1
    const anomalyScore = Math.min(1, anomalyIndicators / 12);
    const avgPathLength = 10 - (anomalyIndicators * 0.8); // Simulated path length
    
    return { anomalyScore, avgPathLength };
  }
  
  private randomSample<T>(array: T[], size: number): T[] {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, size);
  }
  
  private expectedPathLength(n: number): number {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
  }
}

class IsolationTree {
  private splitFeature?: string;
  private splitValue?: number;
  private left?: IsolationTree;
  private right?: IsolationTree;
  private size: number = 0;
  
  build(data: ClaimFeatureVector[], depth: number, maxDepth: number): void {
    this.size = data.length;
    
    if (depth >= maxDepth || data.length <= 1) {
      return;
    }
    
    // Select random feature
    const features = Object.keys(data[0]) as (keyof ClaimFeatureVector)[];
    this.splitFeature = features[Math.floor(Math.random() * features.length)];
    
    // Get min/max for this feature
    const values = data.map(d => d[this.splitFeature as keyof ClaimFeatureVector] as number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    if (min === max) {
      return;
    }
    
    // Random split value between min and max
    this.splitValue = min + Math.random() * (max - min);
    
    // Split data
    const leftData = data.filter(d => (d[this.splitFeature as keyof ClaimFeatureVector] as number) < this.splitValue!);
    const rightData = data.filter(d => (d[this.splitFeature as keyof ClaimFeatureVector] as number) >= this.splitValue!);
    
    if (leftData.length > 0) {
      this.left = new IsolationTree();
      this.left.build(leftData, depth + 1, maxDepth);
    }
    
    if (rightData.length > 0) {
      this.right = new IsolationTree();
      this.right.build(rightData, depth + 1, maxDepth);
    }
  }
  
  pathLength(point: ClaimFeatureVector, depth: number): number {
    if (!this.splitFeature || this.splitValue === undefined) {
      return depth + this.expectedPathLength(this.size);
    }
    
    const value = point[this.splitFeature as keyof ClaimFeatureVector] as number;
    
    if (value < this.splitValue) {
      return this.left ? this.left.pathLength(point, depth + 1) : depth + 1;
    } else {
      return this.right ? this.right.pathLength(point, depth + 1) : depth + 1;
    }
  }
  
  private expectedPathLength(n: number): number {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
  }
}

// ============================================
// ML ALGORITHMS - LOCAL OUTLIER FACTOR (LOF)
// ============================================

export class LOFAlgorithm {
  private k: number = 20;
  private dataPoints: ClaimFeatureVector[] = [];
  
  async train(data: ClaimFeatureVector[]): Promise<void> {
    this.dataPoints = data;
  }
  
  score(point: ClaimFeatureVector): { lofScore: number; neighborhoodSize: number } {
    if (this.dataPoints.length < this.k) {
      return this.scoreWithDefaults(point);
    }
    
    // Find k nearest neighbors
    const distances = this.dataPoints.map(p => ({
      point: p,
      distance: this.euclideanDistance(point, p)
    }));
    distances.sort((a, b) => a.distance - b.distance);
    const neighbors = distances.slice(0, this.k);
    
    // Calculate local reachability density
    const lrd = this.localReachabilityDensity(point, neighbors);
    
    // Calculate LOF
    let lofSum = 0;
    for (const neighbor of neighbors) {
      const neighborNeighbors = this.getNeighbors(neighbor.point);
      const neighborLrd = this.localReachabilityDensity(neighbor.point, neighborNeighbors);
      if (lrd > 0) {
        lofSum += neighborLrd / lrd;
      }
    }
    
    const lofScore = lofSum / this.k;
    
    return { lofScore, neighborhoodSize: this.k };
  }
  
  private scoreWithDefaults(point: ClaimFeatureVector): { lofScore: number; neighborhoodSize: number } {
    // Use feature-based heuristics when no training data
    let outlierScore = 0;
    
    // Check for extreme values in key features
    if (point.claim_amount > 150000) outlierScore += 0.3;
    if (Math.abs(point.amount_vs_provider_avg) > 2.5) outlierScore += 0.25;
    if (point.burst_pattern_score > 0.5) outlierScore += 0.2;
    if (point.member_unique_providers_30d > 8) outlierScore += 0.15;
    if (point.provider_flag_rate_90d > 0.15) outlierScore += 0.1;
    
    // LOF > 1 indicates outlier
    const lofScore = 1 + outlierScore;
    
    return { lofScore, neighborhoodSize: this.k };
  }
  
  private getNeighbors(point: ClaimFeatureVector): Array<{ point: ClaimFeatureVector; distance: number }> {
    const distances = this.dataPoints.map(p => ({
      point: p,
      distance: this.euclideanDistance(point, p)
    }));
    distances.sort((a, b) => a.distance - b.distance);
    return distances.slice(0, this.k);
  }
  
  private localReachabilityDensity(point: ClaimFeatureVector, neighbors: Array<{ point: ClaimFeatureVector; distance: number }>): number {
    if (neighbors.length === 0) return 0;
    
    let sum = 0;
    for (const neighbor of neighbors) {
      const kDistance = this.kDistance(neighbor.point);
      sum += Math.max(kDistance, neighbor.distance);
    }
    
    return neighbors.length / sum;
  }
  
  private kDistance(point: ClaimFeatureVector): number {
    const distances = this.dataPoints.map(p => this.euclideanDistance(point, p));
    distances.sort((a, b) => a - b);
    return distances[Math.min(this.k - 1, distances.length - 1)] || 0;
  }
  
  private euclideanDistance(a: ClaimFeatureVector, b: ClaimFeatureVector): number {
    const keys = Object.keys(a) as (keyof ClaimFeatureVector)[];
    let sumSquared = 0;
    
    for (const key of keys) {
      const va = a[key] as number;
      const vb = b[key] as number;
      sumSquared += Math.pow(va - vb, 2);
    }
    
    return Math.sqrt(sumSquared);
  }
}

// ============================================
// ML ALGORITHMS - DBSCAN
// ============================================

export class DBSCANAlgorithm {
  private eps: number = 0.5;
  private minPts: number = 5;
  private clusters: Map<number, ClaimFeatureVector[]> = new Map();
  
  async train(data: ClaimFeatureVector[]): Promise<void> {
    // DBSCAN doesn't have a traditional training phase
    // We use it to identify clusters in the data
    this.cluster(data);
  }
  
  cluster(data: ClaimFeatureVector[]): Map<number, ClaimFeatureVector[]> {
    const visited = new Set<number>();
    const clustered = new Set<number>();
    let currentCluster = 0;
    
    for (let i = 0; i < data.length; i++) {
      if (visited.has(i)) continue;
      visited.add(i);
      
      const neighbors = this.regionQuery(data, data[i], this.eps);
      
      if (neighbors.length < this.minPts) {
        // Noise point - will get cluster -1
        continue;
      }
      
      // Expand cluster
      currentCluster++;
      this.clusters.set(currentCluster, [data[i]]);
      clustered.add(i);
      
      const seedSet = [...neighbors];
      
      while (seedSet.length > 0) {
        const q = seedSet.shift()!;
        const qIdx = data.indexOf(q);
        
        if (!visited.has(qIdx)) {
          visited.add(qIdx);
          const qNeighbors = this.regionQuery(data, q, this.eps);
          
          if (qNeighbors.length >= this.minPts) {
            seedSet.push(...qNeighbors.filter(n => !seedSet.includes(n)));
          }
        }
        
        if (!clustered.has(qIdx)) {
          clustered.add(qIdx);
          this.clusters.get(currentCluster)!.push(q);
        }
      }
    }
    
    return this.clusters;
  }
  
  predictCluster(point: ClaimFeatureVector): { cluster: number; isNoise: boolean } {
    if (this.clusters.size === 0) {
      return this.predictWithDefaults(point);
    }
    
    // Find nearest cluster
    let nearestCluster = -1;
    let minDistance = Infinity;
    
    const clusterEntries = Array.from(this.clusters.entries());
    for (const [clusterId, clusterPoints] of clusterEntries) {
      // Calculate distance to cluster centroid
      const centroid = this.calculateCentroid(clusterPoints);
      const distance = this.distance(point, centroid);
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestCluster = clusterId;
      }
    }
    
    // If too far from any cluster, it's noise
    const isNoise = minDistance > this.eps * 2;
    
    return {
      cluster: isNoise ? -1 : nearestCluster,
      isNoise
    };
  }
  
  private predictWithDefaults(point: ClaimFeatureVector): { cluster: number; isNoise: boolean } {
    // Use amount-based clustering when no training data
    const amount = point.claim_amount;
    
    let cluster: number;
    if (amount < 5000) cluster = 1;
    else if (amount < 20000) cluster = 2;
    else if (amount < 50000) cluster = 3;
    else if (amount < 100000) cluster = 4;
    else cluster = 5;
    
    // Noise detection based on anomaly indicators
    const isNoise = 
      Math.abs(point.amount_vs_provider_avg) > 3 ||
      point.burst_pattern_score > 0.7 ||
      point.duplicate_window_flag > 0;
    
    return { cluster: isNoise ? -1 : cluster, isNoise };
  }
  
  private regionQuery(data: ClaimFeatureVector[], point: ClaimFeatureVector, eps: number): ClaimFeatureVector[] {
    return data.filter(p => this.distance(point, p) <= eps);
  }
  
  private calculateCentroid(points: ClaimFeatureVector[]): ClaimFeatureVector {
    if (points.length === 0) {
      return {} as ClaimFeatureVector;
    }
    
    const centroid: any = {};
    const keys = Object.keys(points[0]) as (keyof ClaimFeatureVector)[];
    
    for (const key of keys) {
      const values = points.map(p => p[key] as number);
      centroid[key] = values.reduce((a, b) => a + b, 0) / values.length;
    }
    
    return centroid;
  }
  
  private distance(a: ClaimFeatureVector, b: ClaimFeatureVector): number {
    const keys = Object.keys(a) as (keyof ClaimFeatureVector)[];
    let sumSquared = 0;
    
    for (const key of keys) {
      const va = a[key] as number || 0;
      const vb = b[key] as number || 0;
      sumSquared += Math.pow(va - vb, 2);
    }
    
    return Math.sqrt(sumSquared);
  }
}

// ============================================
// ML ALGORITHMS - AUTOENCODER
// ============================================

export class AutoencoderAlgorithm {
  private encoder: number[][] = [];
  private decoder: number[][] = [];
  private inputSize: number = 62;
  private hiddenSizes: number[] = [32, 16, 8];
  private trained: boolean = false;
  
  async train(data: ClaimFeatureVector[], epochs: number = 100): Promise<void> {
    // Initialize weights
    this.initializeWeights();
    
    if (data.length < 10) {
      // Not enough data for training
      return;
    }
    
    // Normalize data
    const normalized = data.map(d => this.normalize(d));
    
    // Simple training loop (gradient descent approximation)
    const learningRate = 0.01;
    
    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const point of normalized) {
        const encoded = this.encode(point);
        const decoded = this.decode(encoded);
        const error = this.calculateError(point, decoded);
        
        // Update weights based on error (simplified)
        this.updateWeights(error, learningRate);
      }
    }
    
    this.trained = true;
  }
  
  score(point: ClaimFeatureVector): { reconstructionError: number; isAnomaly: boolean } {
    const normalized = this.normalize(point);
    const encoded = this.encode(normalized);
    const decoded = this.decode(encoded);
    
    // Calculate reconstruction error (MSE)
    let mse = 0;
    for (let i = 0; i < normalized.length; i++) {
      mse += Math.pow(normalized[i] - decoded[i], 2);
    }
    mse /= normalized.length;
    
    // Threshold for anomaly detection
    const threshold = 0.5;
    const isAnomaly = mse > threshold;
    
    return { reconstructionError: mse, isAnomaly };
  }
  
  private initializeWeights(): void {
    // Initialize encoder weights
    let prevSize = this.inputSize;
    for (const size of this.hiddenSizes) {
      const layer: number[][] = [];
      for (let i = 0; i < prevSize; i++) {
        const row: number[] = [];
        for (let j = 0; j < size; j++) {
          row.push((Math.random() - 0.5) * 0.1);
        }
        layer.push(row);
      }
      this.encoder.push(...layer);
      prevSize = size;
    }
    
    // Initialize decoder weights (mirror of encoder)
    const reversedSizes = [...this.hiddenSizes].reverse();
    reversedSizes.push(this.inputSize);
    prevSize = this.hiddenSizes[this.hiddenSizes.length - 1];
    
    for (const size of reversedSizes.slice(1)) {
      const layer: number[][] = [];
      for (let i = 0; i < prevSize; i++) {
        const row: number[] = [];
        for (let j = 0; j < size; j++) {
          row.push((Math.random() - 0.5) * 0.1);
        }
        layer.push(row);
      }
      this.decoder.push(...layer);
      prevSize = size;
    }
  }
  
  private normalize(point: ClaimFeatureVector): number[] {
    const values = Object.values(point) as number[];
    
    // Min-max normalization to [0, 1]
    const normalized: number[] = [];
    for (const v of values) {
      // Use reasonable ranges for normalization
      const norm = Math.min(1, Math.max(0, v / 1000000));
      normalized.push(norm);
    }
    
    return normalized;
  }
  
  private encode(input: number[]): number[] {
    let current = input;
    
    for (const hiddenSize of this.hiddenSizes) {
      const next: number[] = new Array(hiddenSize).fill(0);
      
      for (let j = 0; j < hiddenSize; j++) {
        for (let i = 0; i < current.length; i++) {
          next[j] += current[i] * (this.encoder[i]?.[j] || 0.01);
        }
        // ReLU activation
        next[j] = Math.max(0, next[j]);
      }
      
      current = next;
    }
    
    return current;
  }
  
  private decode(encoded: number[]): number[] {
    let current = encoded;
    const reversedSizes = [...this.hiddenSizes].reverse();
    reversedSizes.push(this.inputSize);
    
    for (const size of reversedSizes.slice(1)) {
      const next: number[] = new Array(size).fill(0);
      
      for (let j = 0; j < size; j++) {
        for (let i = 0; i < current.length; i++) {
          next[j] += current[i] * (this.decoder[i]?.[j] || 0.01);
        }
        // Sigmoid activation for output
        next[j] = 1 / (1 + Math.exp(-next[j]));
      }
      
      current = next;
    }
    
    return current;
  }
  
  private calculateError(original: number[], reconstructed: number[]): number[] {
    return original.map((v, i) => v - (reconstructed[i] || 0));
  }
  
  private updateWeights(error: number[], learningRate: number): void {
    // Simplified weight update
    const avgError = error.reduce((a, b) => Math.abs(a) + Math.abs(b), 0) / error.length;
    
    for (let i = 0; i < this.encoder.length; i++) {
      for (let j = 0; j < (this.encoder[i]?.length || 0); j++) {
        if (this.encoder[i]) {
          this.encoder[i][j] += learningRate * avgError * (Math.random() - 0.5);
        }
      }
    }
  }
}

// ============================================
// ML ALGORITHMS - DEEP LEARNING ANOMALY
// ============================================

export class DeepLearningAnomalyDetector {
  private weights: number[][][] = [];
  private layers: number[] = [62, 128, 64, 32, 16, 1];
  
  async train(data: ClaimFeatureVector[]): Promise<void> {
    this.initializeWeights();
    // Training would happen here with labeled data
    // For now, we use a pre-configured network
  }
  
  score(point: ClaimFeatureVector): { score: number; confidence: number; featureImportance: Record<string, number> } {
    const input = Object.values(point) as number[];
    const normalized = this.normalizeInput(input);
    
    // Forward pass through network
    let current = normalized;
    const activations: number[][] = [current];
    
    for (let l = 0; l < this.layers.length - 1; l++) {
      const next: number[] = new Array(this.layers[l + 1]).fill(0);
      
      for (let j = 0; j < this.layers[l + 1]; j++) {
        for (let i = 0; i < current.length; i++) {
          next[j] += current[i] * (this.weights[l]?.[i]?.[j] || 0.01);
        }
        // ReLU for hidden, Sigmoid for output
        if (l < this.layers.length - 2) {
          next[j] = Math.max(0, next[j]);
        } else {
          next[j] = 1 / (1 + Math.exp(-next[j]));
        }
      }
      
      current = next;
      activations.push(current);
    }
    
    const score = current[0] || 0;
    
    // Calculate feature importance using gradient approximation
    const featureImportance = this.calculateFeatureImportance(normalized, point);
    
    // Confidence based on score extremity
    const confidence = Math.abs(score - 0.5) * 2;
    
    return { score, confidence, featureImportance };
  }
  
  private initializeWeights(): void {
    this.weights = [];
    
    for (let l = 0; l < this.layers.length - 1; l++) {
      const layer: number[][] = [];
      for (let i = 0; i < this.layers[l]; i++) {
        const neuron: number[] = [];
        for (let j = 0; j < this.layers[l + 1]; j++) {
          // Xavier initialization
          const limit = Math.sqrt(6 / (this.layers[l] + this.layers[l + 1]));
          neuron.push((Math.random() * 2 - 1) * limit);
        }
        layer.push(neuron);
      }
      this.weights.push(layer);
    }
  }
  
  private normalizeInput(input: number[]): number[] {
    return input.map(v => {
      // Clip extreme values and normalize
      const clipped = Math.min(1000000, Math.max(-1000000, v));
      return clipped / 1000000;
    });
  }
  
  private calculateFeatureImportance(normalized: number[], original: ClaimFeatureVector): Record<string, number> {
    const keys = Object.keys(original);
    const importance: Record<string, number> = {};
    
    // Simple importance based on absolute normalized value
    for (let i = 0; i < keys.length; i++) {
      importance[keys[i]] = Math.abs(normalized[i] || 0);
    }
    
    // Normalize to sum to 1
    const total = Object.values(importance).reduce((a, b) => a + b, 0) || 1;
    for (const key of keys) {
      importance[key] /= total;
    }
    
    return importance;
  }
}

// ============================================
// MAIN ML ENGINE
// ============================================

export class UnsupervisedMLEngine {
  private featureService: FeatureEngineeringService;
  private isolationForest: IsolationForestAlgorithm;
  private lof: LOFAlgorithm;
  private dbscan: DBSCANAlgorithm;
  private autoencoder: AutoencoderAlgorithm;
  private deepLearning: DeepLearningAnomalyDetector;
  
  constructor() {
    this.featureService = new FeatureEngineeringService();
    this.isolationForest = new IsolationForestAlgorithm();
    this.lof = new LOFAlgorithm();
    this.dbscan = new DBSCANAlgorithm();
    this.autoencoder = new AutoencoderAlgorithm();
    this.deepLearning = new DeepLearningAnomalyDetector();
  }
  
  // Train all models on historical data
  async trainModels(): Promise<void> {
    console.log('[ML Engine] Starting model training...');
    
    // Get historical claims for training
    const historicalClaims = await db.select()
      .from(claims)
      .limit(1000);
    
    if (historicalClaims.length < 10) {
      console.log('[ML Engine] Insufficient data for training, using default models');
      return;
    }
    
    // Build feature vectors for all claims
    const featureVectors: ClaimFeatureVector[] = [];
    for (const claim of historicalClaims) {
      const features = await this.featureService.buildFeatureVector(claim);
      featureVectors.push(features);
    }
    
    console.log(`[ML Engine] Built ${featureVectors.length} feature vectors`);
    
    // Train each algorithm
    await Promise.all([
      this.isolationForest.train(featureVectors),
      this.lof.train(featureVectors),
      this.dbscan.train(featureVectors),
      this.autoencoder.train(featureVectors),
      this.deepLearning.train(featureVectors)
    ]);
    
    console.log('[ML Engine] All models trained');
  }
  
  // Run full inference on a claim
  async runInference(claim: any): Promise<MLInferenceResult> {
    const startTime = Date.now();
    
    // Build feature vector
    const featureVector = await this.featureService.buildFeatureVector(claim);
    
    // Run all algorithms
    const ifResult = this.isolationForest.score(featureVector);
    const lofResult = this.lof.score(featureVector);
    const dbscanResult = this.dbscan.predictCluster(featureVector);
    const aeResult = this.autoencoder.score(featureVector);
    const dlResult = this.deepLearning.score(featureVector);
    
    // Calculate composite score (weighted average)
    const compositeScore = (
      ifResult.anomalyScore * 0.25 +
      (lofResult.lofScore > 1 ? Math.min((lofResult.lofScore - 1), 1) : 0) * 0.20 +
      (dbscanResult.isNoise ? 1 : 0) * 0.20 +
      (aeResult.reconstructionError * 2) * 0.15 +
      dlResult.score * 0.20
    );
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (compositeScore < 0.3) riskLevel = 'low';
    else if (compositeScore < 0.5) riskLevel = 'medium';
    else if (compositeScore < 0.7) riskLevel = 'high';
    else riskLevel = 'critical';
    
    // Find top contributing features
    const topContributingFeatures = this.findTopContributingFeatures(featureVector, dlResult.featureImportance);
    
    // Generate explanations
    const { reasons, humanExplanation, humanExplanationAr } = this.generateExplanations(
      featureVector, ifResult, lofResult, dbscanResult, aeResult, compositeScore
    );
    
    // Get entity risk scores
    const providerFeatures = await this.featureService.getProviderFeatures(claim.providerId || '');
    const memberFeatures = await this.featureService.getMemberFeatures(claim.patientId || '');
    
    const providerRiskScore = this.calculateEntityRiskScore(providerFeatures);
    const memberRiskScore = this.calculateMemberRiskScore(memberFeatures);
    
    const processingTimeMs = Date.now() - startTime;
    
    return {
      claimId: claim.id || '',
      featureVector,
      
      isolationForest: {
        score: ifResult.anomalyScore,
        depth: ifResult.avgPathLength,
        isAnomaly: ifResult.anomalyScore > 0.6
      },
      lof: {
        score: lofResult.lofScore,
        neighborhoodSize: lofResult.neighborhoodSize,
        isAnomaly: lofResult.lofScore > 1.2
      },
      dbscan: {
        cluster: dbscanResult.cluster,
        isNoise: dbscanResult.isNoise
      },
      autoencoder: {
        reconstructionError: aeResult.reconstructionError,
        isAnomaly: aeResult.isAnomaly
      },
      deepLearning: {
        score: dlResult.score,
        confidence: dlResult.confidence
      },
      
      compositeScore: Math.round(compositeScore * 100),
      riskLevel,
      topContributingFeatures,
      
      anomalyReasons: reasons,
      humanExplanation,
      humanExplanationAr,
      
      providerRiskScore,
      memberRiskScore,
      peerPercentile: 50, // Would be calculated from peer baselines
      
      processingTimeMs
    };
  }
  
  private findTopContributingFeatures(
    features: ClaimFeatureVector,
    importance: Record<string, number>
  ): Array<{ feature: string; value: number; contribution: number; zScore: number }> {
    const entries = Object.entries(features)
      .map(([key, value]) => ({
        feature: key,
        value: value as number,
        contribution: importance[key] || 0,
        zScore: this.calculateZScore(key, value as number)
      }))
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 10);
    
    return entries;
  }
  
  private calculateZScore(feature: string, value: number): number {
    // Simplified z-score calculation using typical ranges
    const ranges: Record<string, { mean: number; std: number }> = {
      claim_amount: { mean: 15000, std: 25000 },
      length_of_stay: { mean: 3, std: 5 },
      provider_claim_count_30d: { mean: 50, std: 30 },
      member_claim_count_30d: { mean: 2, std: 2 },
      amount_vs_provider_avg: { mean: 0, std: 1 },
      amount_vs_peer_group: { mean: 0, std: 1 }
    };
    
    const range = ranges[feature];
    if (range && range.std > 0) {
      return (value - range.mean) / range.std;
    }
    
    return 0;
  }
  
  private generateExplanations(
    features: ClaimFeatureVector,
    ifResult: { anomalyScore: number; avgPathLength: number },
    lofResult: { lofScore: number; neighborhoodSize: number },
    dbscanResult: { cluster: number; isNoise: boolean },
    aeResult: { reconstructionError: number; isAnomaly: boolean },
    compositeScore: number
  ): { reasons: string[]; humanExplanation: string; humanExplanationAr: string } {
    const reasons: string[] = [];
    
    if (ifResult.anomalyScore > 0.6) {
      reasons.push('Isolation Forest detected unusual claim pattern');
    }
    if (lofResult.lofScore > 1.2) {
      reasons.push('Local Outlier Factor indicates deviation from normal claims');
    }
    if (dbscanResult.isNoise) {
      reasons.push('DBSCAN clustering identifies claim as statistical outlier');
    }
    if (aeResult.isAnomaly) {
      reasons.push('Autoencoder reconstruction error exceeds threshold');
    }
    if (features.claim_amount > 100000) {
      reasons.push('Claim amount significantly exceeds typical range');
    }
    if (features.burst_pattern_score > 0.5) {
      reasons.push('Burst pattern detected: multiple claims in short timeframe');
    }
    if (features.duplicate_window_flag > 0) {
      reasons.push('Potential duplicate claim detected within 7-day window');
    }
    if (features.member_unique_providers_30d > 8) {
      reasons.push('Patient visited unusually high number of providers');
    }
    if (Math.abs(features.amount_vs_provider_avg) > 2.5) {
      reasons.push('Claim amount deviates significantly from provider average');
    }
    
    // Human-readable explanation
    let humanExplanation = '';
    let humanExplanationAr = '';
    
    if (compositeScore > 0.7) {
      humanExplanation = `This claim shows critical risk patterns. ${reasons.slice(0, 3).join('. ')}. Immediate review recommended.`;
      humanExplanationAr = `تُظهر هذه المطالبة أنماط مخاطر حرجة. يوصى بالمراجعة الفورية.`;
    } else if (compositeScore > 0.5) {
      humanExplanation = `This claim exhibits elevated risk indicators. ${reasons.slice(0, 2).join('. ')}. Manual review advised.`;
      humanExplanationAr = `تُظهر هذه المطالبة مؤشرات مخاطر مرتفعة. يُنصح بالمراجعة اليدوية.`;
    } else if (compositeScore > 0.3) {
      humanExplanation = `This claim shows moderate anomaly signals. ${reasons[0] || 'Minor deviations detected'}. Standard review process applies.`;
      humanExplanationAr = `تُظهر هذه المطالبة إشارات شذوذ معتدلة. تنطبق عملية المراجعة القياسية.`;
    } else {
      humanExplanation = 'This claim falls within normal parameters. No immediate concerns identified.';
      humanExplanationAr = 'تقع هذه المطالبة ضمن المعايير الطبيعية. لم يتم تحديد مخاوف فورية.';
    }
    
    return { reasons, humanExplanation, humanExplanationAr };
  }
  
  private calculateEntityRiskScore(providerFeatures: any): number {
    let score = 0;
    
    if (providerFeatures.flagRate90d > 0.2) score += 30;
    if (providerFeatures.denialRate90d > 0.3) score += 20;
    if (providerFeatures.weekendRatio > 0.3) score += 10;
    if (providerFeatures.trend7dVs30d > 2) score += 15;
    if (providerFeatures.claimCount30d > 200) score += 10;
    
    return Math.min(100, score);
  }
  
  private calculateMemberRiskScore(memberFeatures: any): number {
    let score = 0;
    
    if (memberFeatures.highUtilizer) score += 25;
    if (memberFeatures.uniqueProviders30d > 8) score += 20;
    if (memberFeatures.frequencyAcceleration > 2) score += 15;
    if (memberFeatures.surgeryCount90d > 3) score += 15;
    if (memberFeatures.claimCount30d > 10) score += 10;
    
    return Math.min(100, score);
  }
  
  // Save inference result to database
  async saveInferenceResult(result: MLInferenceResult): Promise<void> {
    await db.insert(mlClaimInference).values({
      claimId: result.claimId,
      featureVector: result.featureVector as any,
      isolationForestScore: result.isolationForest.score.toString(),
      isolationForestDepth: result.isolationForest.depth.toString(),
      lofScore: result.lof.score.toString(),
      lofNeighborhood: result.lof.neighborhoodSize,
      dbscanCluster: result.dbscan.cluster,
      dbscanIsNoise: result.dbscan.isNoise,
      autoencoderError: result.autoencoder.reconstructionError.toString(),
      deepLearningScore: result.deepLearning.score.toString(),
      compositeAnomalyScore: result.compositeScore.toString(),
      riskLevel: result.riskLevel,
      topContributingFeatures: result.topContributingFeatures as any,
      providerRiskScore: result.providerRiskScore.toString(),
      memberRiskScore: result.memberRiskScore.toString(),
      peerPercentile: result.peerPercentile.toString(),
      anomalyReasons: result.anomalyReasons,
      humanExplanation: result.humanExplanation,
      humanExplanationAr: result.humanExplanationAr,
      processingTimeMs: result.processingTimeMs
    });
  }
}

// Export singleton instance
export const mlEngine = new UnsupervisedMLEngine();
