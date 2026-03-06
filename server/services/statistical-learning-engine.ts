import { db } from "../db";
import { 
  claims,
  populationStatistics,
  statisticalLearningWeights,
  providerFeatureStore,
  memberFeatureStore,
  peerGroupBaselines
} from "@shared/schema";
import { eq, and, gte, sql, desc, isNull } from "drizzle-orm";
import { FeatureEngineeringService, ClaimFeatureVector } from "./ml-unsupervised-engine";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface PopulationStats {
  featureName: string;
  featureCategory: string;
  mean: number;
  stdDev: number;
  median: number;
  p25: number;
  p75: number;
  p95: number;
  p99: number;
  minValue: number;
  maxValue: number;
  sampleSize: number;
}

export interface FeatureWeight {
  featureName: string;
  featureCategory: string;
  weight: number;
  normalizedWeight: number;
  direction: 'positive' | 'negative';
  lowThreshold: number;
  mediumThreshold: number;
  highThreshold: number;
  criticalThreshold: number;
}

export interface FeatureScore {
  featureName: string;
  featureCategory: string;
  rawValue: number;
  zScore: number;
  percentile: number;
  riskContribution: number;
  weight: number;
  direction: string;
}

export interface StatisticalLearningResult {
  score: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  findings: {
    modelVersion: string;
    featureCount: number;
    featureVector: ClaimFeatureVector;
    featureScores: FeatureScore[];
    topContributors: FeatureScore[];
    
    // Peer comparison
    peerComparison: {
      peerGroupId: string;
      peerGroupName: string;
      claimPercentile: number;
      deviationFromMean: number;
      zScoreVsPeers: number;
    };
    
    // Aggregate statistics
    aggregateStats: {
      totalZScore: number;
      avgZScore: number;
      maxZScore: number;
      flaggedFeatureCount: number;
      criticalFeatureCount: number;
    };
    
    // Explanations
    humanExplanation: string;
    humanExplanationAr: string;
    anomalyReasons: string[];
    
    // Model metadata
    populationStatsAge: string;
    weightsVersion: string;
  };
}

// ============================================
// POPULATION STATISTICS SERVICE
// ============================================

export class PopulationStatisticsService {
  private featureService: FeatureEngineeringService;
  
  constructor() {
    this.featureService = new FeatureEngineeringService();
  }
  
  // Get all 62 feature names from the ClaimFeatureVector interface
  private getFeatureNames(): Array<{ name: string; category: string }> {
    return [
      // Raw claim features (18)
      { name: 'claim_amount', category: 'raw' },
      { name: 'surgery_fee', category: 'raw' },
      { name: 'outlier_score', category: 'raw' },
      { name: 'day_of_week', category: 'raw' },
      { name: 'is_weekend', category: 'raw' },
      { name: 'hour_of_day', category: 'raw' },
      { name: 'days_to_submit', category: 'raw' },
      { name: 'length_of_stay', category: 'raw' },
      { name: 'has_surgery', category: 'raw' },
      { name: 'has_icu', category: 'raw' },
      { name: 'diagnosis_count', category: 'raw' },
      { name: 'procedure_count', category: 'raw' },
      { name: 'icd_chapter', category: 'raw' },
      { name: 'similar_claims', category: 'raw' },
      { name: 'similar_claims_hospital', category: 'raw' },
      { name: 'is_flagged', category: 'raw' },
      { name: 'claim_type_encoded', category: 'raw' },
      { name: 'category_encoded', category: 'raw' },
      
      // Provider features (13)
      { name: 'provider_claim_count_7d', category: 'provider' },
      { name: 'provider_claim_count_30d', category: 'provider' },
      { name: 'provider_claim_count_90d', category: 'provider' },
      { name: 'provider_avg_amount_30d', category: 'provider' },
      { name: 'provider_std_amount_30d', category: 'provider' },
      { name: 'provider_unique_patients_30d', category: 'provider' },
      { name: 'provider_unique_diagnoses_30d', category: 'provider' },
      { name: 'provider_denial_rate_90d', category: 'provider' },
      { name: 'provider_flag_rate_90d', category: 'provider' },
      { name: 'provider_weekend_ratio', category: 'provider' },
      { name: 'provider_night_ratio', category: 'provider' },
      { name: 'provider_surgery_rate', category: 'provider' },
      { name: 'provider_avg_los', category: 'provider' },
      
      // Member features (10)
      { name: 'member_claim_count_30d', category: 'member' },
      { name: 'member_claim_count_90d', category: 'member' },
      { name: 'member_unique_providers_30d', category: 'member' },
      { name: 'member_unique_providers_90d', category: 'member' },
      { name: 'member_total_amount_30d', category: 'member' },
      { name: 'member_avg_amount_30d', category: 'member' },
      { name: 'member_unique_diagnoses_30d', category: 'member' },
      { name: 'member_surgery_count_90d', category: 'member' },
      { name: 'member_icu_count_90d', category: 'member' },
      { name: 'member_high_utilizer_flag', category: 'member' },
      
      // Derived features (8)
      { name: 'amount_vs_provider_avg', category: 'derived' },
      { name: 'amount_vs_member_avg', category: 'derived' },
      { name: 'amount_vs_peer_group', category: 'derived' },
      { name: 'los_vs_diagnosis_expected', category: 'derived' },
      { name: 'procedure_diagnosis_mismatch', category: 'derived' },
      { name: 'amount_per_los_day', category: 'derived' },
      { name: 'procedure_density', category: 'derived' },
      { name: 'diagnosis_rarity_score', category: 'derived' },
      
      // Temporal features (8)
      { name: 'provider_trend_7d_vs_30d', category: 'temporal' },
      { name: 'provider_amount_trend', category: 'temporal' },
      { name: 'member_frequency_acceleration', category: 'temporal' },
      { name: 'days_since_last_claim', category: 'temporal' },
      { name: 'claims_same_day', category: 'temporal' },
      { name: 'claims_same_provider_week', category: 'temporal' },
      { name: 'duplicate_window_flag', category: 'temporal' },
      { name: 'burst_pattern_score', category: 'temporal' }
    ];
  }
  
  // Calculate population statistics for all 62 features
  async calculatePopulationStatistics(windowDays: number = 365): Promise<{ 
    success: boolean; 
    featuresCalculated: number;
    sampleSize: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
    
    // Get all claims in window
    const claimsInWindow = await db.select()
      .from(claims)
      .where(gte(claims.serviceDate, windowStart));
    
    if (claimsInWindow.length === 0) {
      return { success: false, featuresCalculated: 0, sampleSize: 0, errors: ['No claims found in time window'] };
    }
    
    // Extract feature vectors for all claims
    const featureVectors: ClaimFeatureVector[] = [];
    for (const claim of claimsInWindow) {
      try {
        const features = await this.featureService.buildFeatureVector(claim);
        featureVectors.push(features);
      } catch (e) {
        // Skip claims with extraction errors
      }
    }
    
    if (featureVectors.length < 10) {
      return { success: false, featuresCalculated: 0, sampleSize: featureVectors.length, errors: ['Insufficient claims for statistics calculation'] };
    }
    
    const featureNames = this.getFeatureNames();
    let featuresCalculated = 0;
    
    // Delete existing statistics for this window
    await db.delete(populationStatistics).where(eq(populationStatistics.windowDays, windowDays));
    
    // Calculate statistics for each feature
    for (const { name, category } of featureNames) {
      try {
        const values = featureVectors.map(fv => (fv as any)[name] as number).filter(v => v !== undefined && v !== null && !isNaN(v));
        
        if (values.length < 5) {
          errors.push(`Insufficient data for feature ${name}`);
          continue;
        }
        
        const sorted = [...values].sort((a, b) => a - b);
        const n = values.length;
        
        // Central tendency
        const mean = values.reduce((a, b) => a + b, 0) / n;
        const median = this.getPercentile(sorted, 50);
        
        // Dispersion
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);
        const p25 = this.getPercentile(sorted, 25);
        const p75 = this.getPercentile(sorted, 75);
        const iqr = p75 - p25;
        
        // Percentiles
        const p1 = this.getPercentile(sorted, 1);
        const p5 = this.getPercentile(sorted, 5);
        const p10 = this.getPercentile(sorted, 10);
        const p50 = median;
        const p90 = this.getPercentile(sorted, 90);
        const p95 = this.getPercentile(sorted, 95);
        const p99 = this.getPercentile(sorted, 99);
        
        // Distribution characteristics
        const skewness = this.calculateSkewness(values, mean, stdDev);
        const kurtosis = this.calculateKurtosis(values, mean, stdDev);
        
        // MAD (Median Absolute Deviation)
        const mad = this.getPercentile(values.map(v => Math.abs(v - median)).sort((a, b) => a - b), 50);
        
        // Insert statistics
        await db.insert(populationStatistics).values({
          featureName: name,
          featureCategory: category,
          mean: mean.toFixed(6),
          median: median.toFixed(6),
          stdDev: stdDev.toFixed(6),
          variance: variance.toFixed(6),
          iqr: iqr.toFixed(6),
          mad: mad.toFixed(6),
          p1: p1.toFixed(6),
          p5: p5.toFixed(6),
          p10: p10.toFixed(6),
          p25: p25.toFixed(6),
          p50: p50.toFixed(6),
          p75: p75.toFixed(6),
          p90: p90.toFixed(6),
          p95: p95.toFixed(6),
          p99: p99.toFixed(6),
          minValue: sorted[0].toFixed(6),
          maxValue: sorted[n - 1].toFixed(6),
          skewness: skewness.toFixed(6),
          kurtosis: kurtosis.toFixed(6),
          sampleSize: n,
          nullCount: featureVectors.length - n,
          zeroCount: values.filter(v => v === 0).length,
          windowDays,
          windowStart,
          windowEnd: now,
          calculatedAt: now
        });
        
        featuresCalculated++;
      } catch (e: any) {
        errors.push(`Error calculating ${name}: ${e.message}`);
      }
    }
    
    return {
      success: featuresCalculated > 0,
      featuresCalculated,
      sampleSize: featureVectors.length,
      errors
    };
  }
  
  private getPercentile(sortedArr: number[], p: number): number {
    if (sortedArr.length === 0) return 0;
    const index = (p / 100) * (sortedArr.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sortedArr[lower];
    return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (index - lower);
  }
  
  private calculateSkewness(values: number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    const n = values.length;
    const m3 = values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 3), 0) / n;
    return m3;
  }
  
  private calculateKurtosis(values: number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    const n = values.length;
    const m4 = values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 4), 0) / n;
    return m4 - 3; // Excess kurtosis
  }
  
  // Get population statistics from database
  async getPopulationStats(): Promise<Map<string, PopulationStats>> {
    const stats = await db.select().from(populationStatistics);
    const map = new Map<string, PopulationStats>();
    
    for (const s of stats) {
      map.set(s.featureName, {
        featureName: s.featureName,
        featureCategory: s.featureCategory,
        mean: parseFloat(s.mean) || 0,
        stdDev: parseFloat(s.stdDev) || 1,
        median: parseFloat(s.median || '0') || 0,
        p25: parseFloat(s.p25 || '0') || 0,
        p75: parseFloat(s.p75 || '0') || 0,
        p95: parseFloat(s.p95 || '0') || 0,
        p99: parseFloat(s.p99 || '0') || 0,
        minValue: parseFloat(s.minValue || '0') || 0,
        maxValue: parseFloat(s.maxValue || '0') || 0,
        sampleSize: s.sampleSize
      });
    }
    
    return map;
  }
  
  // API Methods for routes
  
  // Get all statistics as array (for API)
  async getAll(): Promise<any[]> {
    const stats = await db.select().from(populationStatistics);
    return stats.map(s => ({
      id: s.id,
      featureName: s.featureName,
      featureCategory: s.featureCategory,
      mean: s.mean,
      stdDev: s.stdDev,
      min: s.minValue,
      max: s.maxValue,
      percentile25: s.p25,
      percentile50: s.p50,
      percentile75: s.p75,
      percentile90: s.p90,
      percentile99: s.p99,
      sampleSize: s.sampleSize,
      calculatedAt: s.calculatedAt
    }));
  }
  
  // Get statistics for specific feature
  async getByFeature(featureName: string): Promise<any | null> {
    const [stat] = await db.select()
      .from(populationStatistics)
      .where(eq(populationStatistics.featureName, featureName))
      .limit(1);
    
    if (!stat) return null;
    
    return {
      id: stat.id,
      featureName: stat.featureName,
      featureCategory: stat.featureCategory,
      mean: stat.mean,
      stdDev: stat.stdDev,
      median: stat.median,
      variance: stat.variance,
      min: stat.minValue,
      max: stat.maxValue,
      percentile1: stat.p1,
      percentile5: stat.p5,
      percentile10: stat.p10,
      percentile25: stat.p25,
      percentile50: stat.p50,
      percentile75: stat.p75,
      percentile90: stat.p90,
      percentile95: stat.p95,
      percentile99: stat.p99,
      skewness: stat.skewness,
      kurtosis: stat.kurtosis,
      iqr: stat.iqr,
      mad: stat.mad,
      sampleSize: stat.sampleSize,
      nullCount: stat.nullCount,
      zeroCount: stat.zeroCount,
      windowDays: stat.windowDays,
      calculatedAt: stat.calculatedAt
    };
  }
  
  // Recalculate all statistics (wrapper for API)
  async recalculateAll(): Promise<{ featuresProcessed: number; claimsAnalyzed: number }> {
    const result = await this.calculatePopulationStatistics(365);
    return {
      featuresProcessed: result.featuresCalculated,
      claimsAnalyzed: result.sampleSize
    };
  }
}

// ============================================
// FEATURE WEIGHTS SERVICE
// ============================================

export class FeatureWeightsService {
  
  // Seed default feature weights based on domain expertise
  async seedDefaultWeights(): Promise<{ success: boolean; weightsSeeded: number }> {
    // Check if weights already exist
    const existing = await db.select({ count: sql<number>`count(*)` }).from(statisticalLearningWeights);
    if ((existing[0]?.count || 0) > 0) {
      return { success: true, weightsSeeded: 0 };
    }
    
    // Default weights based on FWA domain expertise
    const defaultWeights: Array<{
      featureName: string;
      featureCategory: string;
      weight: number;
      direction: 'positive' | 'negative';
      lowThreshold: number;
      mediumThreshold: number;
      highThreshold: number;
      criticalThreshold: number;
    }> = [
      // High importance - Amount features
      { featureName: 'claim_amount', featureCategory: 'raw', weight: 0.08, direction: 'positive', lowThreshold: 1, mediumThreshold: 2, highThreshold: 3, criticalThreshold: 4 },
      { featureName: 'amount_vs_provider_avg', featureCategory: 'derived', weight: 0.07, direction: 'positive', lowThreshold: 1.5, mediumThreshold: 2.5, highThreshold: 3.5, criticalThreshold: 5 },
      { featureName: 'amount_vs_peer_group', featureCategory: 'derived', weight: 0.07, direction: 'positive', lowThreshold: 1.5, mediumThreshold: 2.5, highThreshold: 3.5, criticalThreshold: 5 },
      
      // High importance - Provider patterns
      { featureName: 'provider_flag_rate_90d', featureCategory: 'provider', weight: 0.06, direction: 'positive', lowThreshold: 0.05, mediumThreshold: 0.1, highThreshold: 0.2, criticalThreshold: 0.3 },
      { featureName: 'provider_denial_rate_90d', featureCategory: 'provider', weight: 0.05, direction: 'positive', lowThreshold: 0.1, mediumThreshold: 0.2, highThreshold: 0.3, criticalThreshold: 0.5 },
      { featureName: 'provider_weekend_ratio', featureCategory: 'provider', weight: 0.04, direction: 'positive', lowThreshold: 0.3, mediumThreshold: 0.5, highThreshold: 0.7, criticalThreshold: 0.9 },
      { featureName: 'provider_night_ratio', featureCategory: 'provider', weight: 0.04, direction: 'positive', lowThreshold: 0.3, mediumThreshold: 0.5, highThreshold: 0.7, criticalThreshold: 0.9 },
      
      // High importance - Member patterns
      { featureName: 'member_high_utilizer_flag', featureCategory: 'member', weight: 0.05, direction: 'positive', lowThreshold: 0, mediumThreshold: 0.5, highThreshold: 0.8, criticalThreshold: 1 },
      { featureName: 'member_claim_count_30d', featureCategory: 'member', weight: 0.04, direction: 'positive', lowThreshold: 2, mediumThreshold: 3, highThreshold: 5, criticalThreshold: 8 },
      
      // Medium importance - Temporal patterns
      { featureName: 'burst_pattern_score', featureCategory: 'temporal', weight: 0.05, direction: 'positive', lowThreshold: 0.2, mediumThreshold: 0.4, highThreshold: 0.6, criticalThreshold: 0.8 },
      { featureName: 'duplicate_window_flag', featureCategory: 'temporal', weight: 0.05, direction: 'positive', lowThreshold: 0, mediumThreshold: 0.5, highThreshold: 0.8, criticalThreshold: 1 },
      { featureName: 'claims_same_day', featureCategory: 'temporal', weight: 0.04, direction: 'positive', lowThreshold: 1, mediumThreshold: 2, highThreshold: 3, criticalThreshold: 5 },
      
      // Medium importance - Clinical patterns
      { featureName: 'procedure_diagnosis_mismatch', featureCategory: 'derived', weight: 0.05, direction: 'positive', lowThreshold: 0.2, mediumThreshold: 0.4, highThreshold: 0.6, criticalThreshold: 0.8 },
      { featureName: 'diagnosis_rarity_score', featureCategory: 'derived', weight: 0.04, direction: 'positive', lowThreshold: 0.6, mediumThreshold: 0.8, highThreshold: 0.9, criticalThreshold: 0.95 },
      { featureName: 'los_vs_diagnosis_expected', featureCategory: 'derived', weight: 0.03, direction: 'positive', lowThreshold: 1.5, mediumThreshold: 2, highThreshold: 3, criticalThreshold: 4 },
      
      // Lower importance - Volume features
      { featureName: 'provider_claim_count_30d', featureCategory: 'provider', weight: 0.03, direction: 'positive', lowThreshold: 50, mediumThreshold: 100, highThreshold: 200, criticalThreshold: 500 },
      { featureName: 'provider_claim_count_7d', featureCategory: 'provider', weight: 0.02, direction: 'positive', lowThreshold: 15, mediumThreshold: 30, highThreshold: 50, criticalThreshold: 100 },
      { featureName: 'member_claim_count_90d', featureCategory: 'member', weight: 0.02, direction: 'positive', lowThreshold: 5, mediumThreshold: 10, highThreshold: 15, criticalThreshold: 25 },
      
      // Lower importance - Other features
      { featureName: 'surgery_fee', featureCategory: 'raw', weight: 0.02, direction: 'positive', lowThreshold: 1, mediumThreshold: 2, highThreshold: 3, criticalThreshold: 4 },
      { featureName: 'outlier_score', featureCategory: 'raw', weight: 0.03, direction: 'positive', lowThreshold: 0.3, mediumThreshold: 0.5, highThreshold: 0.7, criticalThreshold: 0.9 },
      { featureName: 'is_weekend', featureCategory: 'raw', weight: 0.02, direction: 'positive', lowThreshold: 0, mediumThreshold: 0.5, highThreshold: 0.8, criticalThreshold: 1 },
      { featureName: 'length_of_stay', featureCategory: 'raw', weight: 0.02, direction: 'positive', lowThreshold: 1.5, mediumThreshold: 2, highThreshold: 3, criticalThreshold: 5 },
      { featureName: 'has_surgery', featureCategory: 'raw', weight: 0.01, direction: 'positive', lowThreshold: 0, mediumThreshold: 0.5, highThreshold: 0.8, criticalThreshold: 1 },
      { featureName: 'has_icu', featureCategory: 'raw', weight: 0.01, direction: 'positive', lowThreshold: 0, mediumThreshold: 0.5, highThreshold: 0.8, criticalThreshold: 1 },
      { featureName: 'provider_surgery_rate', featureCategory: 'provider', weight: 0.02, direction: 'positive', lowThreshold: 0.3, mediumThreshold: 0.5, highThreshold: 0.7, criticalThreshold: 0.9 },
      { featureName: 'provider_avg_los', featureCategory: 'provider', weight: 0.01, direction: 'positive', lowThreshold: 1.5, mediumThreshold: 2, highThreshold: 3, criticalThreshold: 5 },
      { featureName: 'member_surgery_count_90d', featureCategory: 'member', weight: 0.01, direction: 'positive', lowThreshold: 1, mediumThreshold: 2, highThreshold: 3, criticalThreshold: 5 },
      { featureName: 'member_icu_count_90d', featureCategory: 'member', weight: 0.01, direction: 'positive', lowThreshold: 1, mediumThreshold: 2, highThreshold: 3, criticalThreshold: 5 },
      { featureName: 'days_since_last_claim', featureCategory: 'temporal', weight: 0.01, direction: 'negative', lowThreshold: 30, mediumThreshold: 14, highThreshold: 7, criticalThreshold: 2 },
      { featureName: 'provider_trend_7d_vs_30d', featureCategory: 'temporal', weight: 0.02, direction: 'positive', lowThreshold: 1.5, mediumThreshold: 2, highThreshold: 3, criticalThreshold: 5 },
    ];
    
    // Calculate normalized weights
    const totalWeight = defaultWeights.reduce((sum, w) => sum + w.weight, 0);
    
    for (const w of defaultWeights) {
      await db.insert(statisticalLearningWeights).values({
        modelVersion: 'v1.0',
        modelName: 'statistical_learning_enterprise',
        featureName: w.featureName,
        featureCategory: w.featureCategory,
        weight: w.weight.toFixed(6),
        normalizedWeight: (w.weight / totalWeight).toFixed(6),
        direction: w.direction,
        lowThreshold: w.lowThreshold.toFixed(6),
        mediumThreshold: w.mediumThreshold.toFixed(6),
        highThreshold: w.highThreshold.toFixed(6),
        criticalThreshold: w.criticalThreshold.toFixed(6),
        trainedOn: 'Domain expertise initialization',
        featureImportanceRank: defaultWeights.indexOf(w) + 1,
        isActive: true
      });
    }
    
    return { success: true, weightsSeeded: defaultWeights.length };
  }
  
  // Get feature weights from database
  async getFeatureWeights(): Promise<Map<string, FeatureWeight>> {
    const weights = await db.select()
      .from(statisticalLearningWeights)
      .where(eq(statisticalLearningWeights.isActive, true));
    
    const map = new Map<string, FeatureWeight>();
    
    for (const w of weights) {
      map.set(w.featureName, {
        featureName: w.featureName,
        featureCategory: w.featureCategory,
        weight: parseFloat(w.weight) || 0,
        normalizedWeight: parseFloat(w.normalizedWeight || '0') || 0,
        direction: (w.direction as 'positive' | 'negative') || 'positive',
        lowThreshold: parseFloat(w.lowThreshold || '0') || 0,
        mediumThreshold: parseFloat(w.mediumThreshold || '0') || 0,
        highThreshold: parseFloat(w.highThreshold || '0') || 0,
        criticalThreshold: parseFloat(w.criticalThreshold || '0') || 0
      });
    }
    
    return map;
  }
  
  // API Methods for routes
  
  // Get all weights as array (for API)
  async getAll(): Promise<any[]> {
    const weights = await db.select()
      .from(statisticalLearningWeights)
      .where(eq(statisticalLearningWeights.isActive, true));
    
    return weights.map(w => ({
      id: w.id,
      featureName: w.featureName,
      category: w.featureCategory,
      weight: w.weight,
      normalizedWeight: w.normalizedWeight,
      direction: w.direction,
      lowThreshold: w.lowThreshold,
      mediumThreshold: w.mediumThreshold,
      highThreshold: w.highThreshold,
      criticalThreshold: w.criticalThreshold,
      featureImportanceRank: w.featureImportanceRank,
      updatedAt: w.updatedAt
    }));
  }
  
  // Update weight for specific feature
  async update(featureName: string, updates: { weight?: number; direction?: string; category?: string }): Promise<any | null> {
    const [existing] = await db.select()
      .from(statisticalLearningWeights)
      .where(eq(statisticalLearningWeights.featureName, featureName))
      .limit(1);
    
    if (!existing) return null;
    
    const updateData: any = { updatedAt: new Date() };
    if (updates.weight !== undefined) {
      updateData.weight = updates.weight.toFixed(6);
    }
    if (updates.direction) {
      updateData.direction = updates.direction;
    }
    if (updates.category) {
      updateData.featureCategory = updates.category;
    }
    
    const [updated] = await db.update(statisticalLearningWeights)
      .set(updateData)
      .where(eq(statisticalLearningWeights.featureName, featureName))
      .returning();
    
    return updated ? {
      id: updated.id,
      featureName: updated.featureName,
      weight: updated.weight,
      direction: updated.direction,
      category: updated.featureCategory
    } : null;
  }
  
  // Initialize defaults (wrapper for seedDefaultWeights)
  async initializeDefaults(): Promise<{ weightsCreated: number }> {
    // Force reinitialize - first delete existing
    await db.delete(statisticalLearningWeights);
    
    const result = await this.seedDefaultWeights();
    return { weightsCreated: result.weightsSeeded };
  }
}

// ============================================
// ENTERPRISE STATISTICAL LEARNING ENGINE
// ============================================

export class StatisticalLearningEngine {
  private featureService: FeatureEngineeringService;
  private statsService: PopulationStatisticsService;
  private weightsService: FeatureWeightsService;
  
  constructor() {
    this.featureService = new FeatureEngineeringService();
    this.statsService = new PopulationStatisticsService();
    this.weightsService = new FeatureWeightsService();
  }
  
  // Main detection method - Enterprise Grade
  async runStatisticalDetection(claimData: {
    id?: string;
    amount: number;
    providerId?: string;
    patientId?: string;
    diagnosisCode?: string;
    procedureCode?: string;
    serviceDate?: Date | string;
    claimType?: string;
    description?: string;
    [key: string]: any;
  }): Promise<StatisticalLearningResult> {
    const startTime = Date.now();
    
    // Get population statistics from database
    const populationStats = await this.statsService.getPopulationStats();
    
    // Get feature weights from database
    const featureWeights = await this.weightsService.getFeatureWeights();
    
    // Ensure weights are seeded if empty
    if (featureWeights.size === 0) {
      await this.weightsService.seedDefaultWeights();
      const weights = await this.weightsService.getFeatureWeights();
      weights.forEach((v, k) => featureWeights.set(k, v));
    }
    
    // Convert claim data to format expected by feature service
    const claim = this.normalizeClaimData(claimData);
    
    // Extract 62-feature vector
    const featureVector = await this.featureService.buildFeatureVector(claim);
    
    // Score each feature using population statistics
    const featureScores: FeatureScore[] = [];
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    for (const [featureName, rawValue] of Object.entries(featureVector)) {
      const value = rawValue as number;
      const stats = populationStats.get(featureName);
      const weight = featureWeights.get(featureName);
      
      if (!stats || !weight) continue;
      
      // Calculate z-score using real population statistics
      const zScore = stats.stdDev > 0 ? (value - stats.mean) / stats.stdDev : 0;
      
      // Calculate percentile
      const percentile = this.calculatePercentileFromStats(value, stats);
      
      // Calculate risk contribution based on z-score and direction
      let riskContribution = 0;
      if (weight.direction === 'positive') {
        // Higher values = higher risk
        riskContribution = Math.max(0, Math.min(1, (zScore + 2) / 4));
      } else {
        // Lower values = higher risk
        riskContribution = Math.max(0, Math.min(1, (-zScore + 2) / 4));
      }
      
      // Apply weight
      const weightedContribution = riskContribution * weight.normalizedWeight;
      totalWeightedScore += weightedContribution;
      totalWeight += weight.normalizedWeight;
      
      featureScores.push({
        featureName,
        featureCategory: weight.featureCategory,
        rawValue: value,
        zScore,
        percentile,
        riskContribution: riskContribution * 100,
        weight: weight.weight,
        direction: weight.direction
      });
    }
    
    // Normalize score to 0-100
    const normalizedScore = totalWeight > 0 
      ? Math.min(100, Math.max(0, (totalWeightedScore / totalWeight) * 100))
      : 0;
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (normalizedScore >= 75) riskLevel = 'critical';
    else if (normalizedScore >= 50) riskLevel = 'high';
    else if (normalizedScore >= 25) riskLevel = 'medium';
    
    // Get top contributors
    const topContributors = featureScores
      .sort((a, b) => Math.abs(b.zScore) * b.weight - Math.abs(a.zScore) * a.weight)
      .slice(0, 10);
    
    // Calculate aggregate statistics
    const zScores = featureScores.map(f => f.zScore);
    const aggregateStats = {
      totalZScore: zScores.reduce((a, b) => a + b, 0),
      avgZScore: zScores.length > 0 ? zScores.reduce((a, b) => a + b, 0) / zScores.length : 0,
      maxZScore: Math.max(...zScores, 0),
      flaggedFeatureCount: featureScores.filter(f => Math.abs(f.zScore) > 2).length,
      criticalFeatureCount: featureScores.filter(f => Math.abs(f.zScore) > 3).length
    };
    
    // Get peer group comparison
    const peerComparison = await this.getPeerComparison(claim, featureVector, normalizedScore);
    
    // Generate explanations
    const anomalyReasons = this.generateAnomalyReasons(topContributors, aggregateStats);
    const humanExplanation = this.generateHumanExplanation(normalizedScore, topContributors, peerComparison);
    const humanExplanationAr = this.generateHumanExplanationAr(normalizedScore, topContributors, peerComparison);
    
    // Get metadata
    const latestStats = await db.select({ calculatedAt: populationStatistics.calculatedAt })
      .from(populationStatistics)
      .orderBy(desc(populationStatistics.calculatedAt))
      .limit(1);
    const statsAge = latestStats.length > 0 
      ? this.getRelativeTime(latestStats[0].calculatedAt!)
      : 'Not calculated';
    
    return {
      score: normalizedScore,
      riskLevel,
      findings: {
        modelVersion: 'enterprise_v1.0',
        featureCount: featureScores.length,
        featureVector,
        featureScores: featureScores.sort((a, b) => b.riskContribution - a.riskContribution),
        topContributors,
        peerComparison,
        aggregateStats,
        humanExplanation,
        humanExplanationAr,
        anomalyReasons,
        populationStatsAge: statsAge,
        weightsVersion: 'v1.0'
      }
    };
  }
  
  private normalizeClaimData(data: any): any {
    return {
      id: data.id || data.claimId || `temp_${Date.now()}`,
      claimNumber: data.claimNumber || data.claim_number || '',
      amount: data.amount || 0,
      surgeryFee: data.surgeryFee || data.surgery_fee || 0,
      outlierScore: data.outlierScore || data.outlier_score || 0,
      providerId: data.providerId || data.provider_id || '',
      patientId: data.patientId || data.patient_id || '',
      icd: data.diagnosisCode || data.icd || '',
      cptCodes: data.procedureCode ? [data.procedureCode] : (data.cptCodes || []),
      diagnosisCodes: data.diagnosisCode ? [data.diagnosisCode] : (data.diagnosisCodes || []),
      serviceDate: data.serviceDate || data.service_date || new Date(),
      registrationDate: data.registrationDate || data.registration_date || new Date(),
      claimType: data.claimType || data.claim_type || 'outpatient',
      category: data.category || 'medical',
      lengthOfStay: data.lengthOfStay || data.length_of_stay || 0,
      hasSurgery: data.hasSurgery || data.has_surgery || 'no',
      hasIcu: data.hasIcu || data.has_icu || 'no',
      similarClaims: data.similarClaims || data.similar_claims || 0,
      similarClaimsInHospital: data.similarClaimsInHospital || data.similar_claims_in_hospital || 0,
      flagged: data.flagged || false,
      status: data.status || 'pending',
      description: data.description || '',
      policyNumber: data.policyNumber || '',
      hospital: data.hospital || ''
    };
  }
  
  private calculatePercentileFromStats(value: number, stats: PopulationStats): number {
    // Estimate percentile based on z-score (assuming normal distribution)
    const zScore = stats.stdDev > 0 ? (value - stats.mean) / stats.stdDev : 0;
    // Use standard normal CDF approximation
    return this.normalCdf(zScore) * 100;
  }
  
  private normalCdf(z: number): number {
    // Approximation of standard normal CDF
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    
    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);
    
    const t = 1.0 / (1.0 + p * z);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
    
    return 0.5 * (1.0 + sign * y);
  }
  
  private async getPeerComparison(claim: any, features: ClaimFeatureVector, score: number): Promise<{
    peerGroupId: string;
    peerGroupName: string;
    claimPercentile: number;
    deviationFromMean: number;
    zScoreVsPeers: number;
  }> {
    // Get peer group baselines from database
    const peerGroups = await db.select().from(peerGroupBaselines).limit(1);
    
    if (peerGroups.length === 0) {
      return {
        peerGroupId: 'default',
        peerGroupName: 'All Providers',
        claimPercentile: score,
        deviationFromMean: score - 50,
        zScoreVsPeers: (score - 50) / 25
      };
    }
    
    const peer = peerGroups[0];
    const avgAmount = parseFloat(peer.avgClaimAmount || '0') || 15000;
    const stdAmount = parseFloat(peer.stdClaimAmount || '0') || 25000;
    
    const zScore = stdAmount > 0 ? (features.claim_amount - avgAmount) / stdAmount : 0;
    
    return {
      peerGroupId: peer.id,
      peerGroupName: peer.groupName || peer.groupKey || 'All Providers',
      claimPercentile: this.normalCdf(zScore) * 100,
      deviationFromMean: features.claim_amount - avgAmount,
      zScoreVsPeers: zScore
    };
  }
  
  private generateAnomalyReasons(topContributors: FeatureScore[], stats: any): string[] {
    const reasons: string[] = [];
    
    for (const feature of topContributors.slice(0, 5)) {
      if (Math.abs(feature.zScore) > 2) {
        const direction = feature.zScore > 0 ? 'above' : 'below';
        reasons.push(`${feature.featureName.replace(/_/g, ' ')} is ${Math.abs(feature.zScore).toFixed(1)} std devs ${direction} average`);
      }
    }
    
    if (stats.flaggedFeatureCount > 3) {
      reasons.push(`${stats.flaggedFeatureCount} features exceed normal thresholds`);
    }
    
    if (stats.criticalFeatureCount > 0) {
      reasons.push(`${stats.criticalFeatureCount} features at critical levels`);
    }
    
    return reasons;
  }
  
  private generateHumanExplanation(score: number, contributors: FeatureScore[], peer: any): string {
    const riskWord = score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'moderate' : 'low';
    
    let explanation = `This claim has a ${riskWord} risk score of ${score.toFixed(1)} based on analysis of 62 features from the claim population. `;
    
    if (contributors.length > 0) {
      const topFeature = contributors[0];
      explanation += `The primary risk driver is ${topFeature.featureName.replace(/_/g, ' ')} (z-score: ${topFeature.zScore.toFixed(2)}). `;
    }
    
    explanation += `Compared to peer group "${peer.peerGroupName}", this claim is at the ${peer.claimPercentile.toFixed(0)}th percentile.`;
    
    return explanation;
  }
  
  private generateHumanExplanationAr(score: number, contributors: FeatureScore[], peer: any): string {
    const riskWord = score >= 75 ? 'حرج' : score >= 50 ? 'عالي' : score >= 25 ? 'متوسط' : 'منخفض';
    
    let explanation = `هذه المطالبة لديها مستوى خطر ${riskWord} بدرجة ${score.toFixed(1)} بناءً على تحليل 62 سمة من مجموع المطالبات. `;
    
    if (contributors.length > 0) {
      const topFeature = contributors[0];
      explanation += `العامل الرئيسي للخطر هو ${topFeature.featureName} (درجة z: ${topFeature.zScore.toFixed(2)}). `;
    }
    
    explanation += `مقارنة بمجموعة النظراء "${peer.peerGroupName}"، هذه المطالبة في المئين ${peer.claimPercentile.toFixed(0)}.`;
    
    return explanation;
  }
  
  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'Just now';
  }
}

// Export singleton instance
export const statisticalLearningEngine = new StatisticalLearningEngine();
export const populationStatsService = new PopulationStatisticsService();
export const featureWeightsService = new FeatureWeightsService();
