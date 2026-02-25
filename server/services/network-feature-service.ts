import { db } from "../db";
import { claims } from "@shared/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { storage } from "../storage";

export interface NetworkFeatures {
  cross_entity_anomaly: number;
  entity_network_score: number;
  collusion_indicator: number;
}

export class NetworkFeatureService {
  private tripletFrequencyCache: Map<string, number> = new Map();
  private totalTripletsCount: number = 0;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  async calculateNetworkFeatures(
    providerId: string | null,
    patientId: string | null,
    doctorId: string | null,
    claimAmount: number
  ): Promise<NetworkFeatures> {
    const [crossEntityAnomaly, entityNetworkScore, collusionIndicator] = await Promise.all([
      this.calculateCrossEntityAnomaly(providerId, patientId, doctorId),
      this.calculateEntityNetworkScore(providerId, patientId, doctorId),
      this.calculateCollusionIndicator(providerId, patientId, doctorId, claimAmount)
    ]);

    return {
      cross_entity_anomaly: crossEntityAnomaly,
      entity_network_score: entityNetworkScore,
      collusion_indicator: collusionIndicator
    };
  }

  private async calculateCrossEntityAnomaly(
    providerId: string | null,
    patientId: string | null,
    doctorId: string | null
  ): Promise<number> {
    if (!providerId || !patientId) return 0;

    await this.ensureTripletCacheValid();

    // Use provider_id:patient_id as the pair key (hospital is optional)
    // Try to find ANY matching triplet for this provider-patient pair
    const pairPrefix = `${providerId}:${patientId}:`;
    let totalPairCount = 0;
    
    // Sum all triplets matching this provider-patient pair (regardless of hospital)
    for (const [key, count] of this.tripletFrequencyCache.entries()) {
      if (key.startsWith(pairPrefix)) {
        totalPairCount += count;
      }
    }

    if (this.totalTripletsCount === 0) return 0;

    const frequency = totalPairCount / this.totalTripletsCount;

    // Rarity scoring - rare pairs indicate anomalous connections
    if (frequency === 0) return 0.95;
    if (frequency < 0.001) return 0.9;
    if (frequency < 0.005) return 0.8;
    if (frequency < 0.01) return 0.7;
    if (frequency < 0.02) return 0.6;
    if (frequency < 0.05) return 0.5;
    if (frequency < 0.10) return 0.3;
    return 0.1;
  }

  private async calculateEntityNetworkScore(
    providerId: string | null,
    patientId: string | null,
    doctorId: string | null
  ): Promise<number> {
    if (!providerId) return 0;

    const day90Ago = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Note: doctor_id doesn't exist in claims table, so we use provider_id and hospital for network analysis
    const [providerPatients, providerClaims, patientProviders] = await Promise.all([
      db.select({ count: sql<number>`COUNT(DISTINCT patient_id)` })
        .from(claims)
        .where(and(
          eq(claims.providerId, providerId),
          gte(claims.serviceDate, day90Ago)
        )),
      db.select({ count: sql<number>`COUNT(*)` })
        .from(claims)
        .where(and(
          eq(claims.providerId, providerId),
          gte(claims.serviceDate, day90Ago)
        )),
      patientId ? db.select({ count: sql<number>`COUNT(DISTINCT provider_id)` })
        .from(claims)
        .where(and(
          eq(claims.patientId, patientId),
          gte(claims.serviceDate, day90Ago)
        )) : Promise.resolve([{ count: 0 }])
    ]);

    const uniquePatients = providerPatients[0]?.count || 0;
    const totalClaims = providerClaims[0]?.count || 0;
    const patientUniqueProviders = patientProviders[0]?.count || 0;

    let score = 0;

    // High concentration: few patients with many claims suggests potential fraud
    if (uniquePatients <= 3 && totalClaims > 10) {
      score += 0.4;
    }

    if (patientUniqueProviders <= 1) {
      score += 0.3;
    }

    if (uniquePatients > 0 && uniquePatients <= 5) {
      const concentrationRatio = 1 / uniquePatients;
      if (concentrationRatio > 0.3) score += 0.3;
    }

    return Math.min(1, score);
  }

  private async calculateCollusionIndicator(
    providerId: string | null,
    patientId: string | null,
    doctorId: string | null,
    claimAmount: number
  ): Promise<number> {
    if (!providerId) return 0;

    let score = 0;

    try {
      const collusionRings = await storage.listCollusionRings();
      
      for (const ring of collusionRings) {
        if (ring.status !== 'active' && ring.status !== 'investigating') continue;
        
        const members = ring.members as any[] || [];
        let matchCount = 0;
        
        for (const member of members) {
          if (member.entityId === providerId && member.entityType === 'provider') matchCount++;
          if (member.entityId === patientId && member.entityType === 'patient') matchCount++;
          if (member.entityId === doctorId && member.entityType === 'doctor') matchCount++;
        }
        
        if (matchCount >= 2) {
          score = Math.max(score, 0.9);
        } else if (matchCount === 1) {
          score = Math.max(score, 0.5);
        }
      }
    } catch (e) {
    }

    if (score < 0.5) {
      const patterns = await this.detectCollusionPatterns(providerId, patientId, doctorId);
      score = Math.max(score, patterns);
    }

    return score;
  }

  private async detectCollusionPatterns(
    providerId: string | null,
    patientId: string | null,
    doctorId: string | null
  ): Promise<number> {
    if (!providerId || !patientId) return 0;

    const day90Ago = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Query same patient claims and multi-provider patterns (no doctor_id in claims table)
    const [samePatientClaims, multiProviderPatterns] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(claims)
        .where(and(
          eq(claims.providerId, providerId),
          eq(claims.patientId, patientId),
          gte(claims.serviceDate, day90Ago)
        )),
      
      // Check for patient visiting multiple providers with same diagnosis (potential referral fraud)
      db.execute(sql`
        SELECT COUNT(*) as count FROM claims c1
        WHERE c1.provider_id = ${providerId}
        AND c1.patient_id = ${patientId}
        AND c1.service_date >= ${day90Ago}
        AND EXISTS (
          SELECT 1 FROM claims c2
          WHERE c2.provider_id != ${providerId}
          AND c2.patient_id = ${patientId}
          AND c2.icd = c1.icd
          AND c2.service_date >= ${day90Ago}
          AND ABS(EXTRACT(DAY FROM c2.service_date - c1.service_date)) <= 7
        )
      `)
    ]);

    const samePatientCount = samePatientClaims[0]?.count || 0;
    const multiProviderCount = (multiProviderPatterns as any).rows?.[0]?.count || 0;

    let score = 0;

    if (samePatientCount > 10) {
      score += 0.4;
    } else if (samePatientCount > 5) {
      score += 0.2;
    }

    // Multiple providers with same diagnosis within 7 days suggests potential collusion
    if (multiProviderCount > 3) {
      score += 0.3;
    }

    return Math.min(1, score);
  }

  private async ensureTripletCacheValid(): Promise<void> {
    if (Date.now() < this.cacheExpiry && this.tripletFrequencyCache.size > 0) {
      return;
    }

    const day90Ago = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Use provider_id:patient_id:hospital as triplet key (no doctor_id in claims table)
    const tripletCounts = await db.execute(sql`
      SELECT 
        provider_id || ':' || patient_id || ':' || COALESCE(hospital, 'none') as triplet,
        COUNT(*) as cnt
      FROM claims
      WHERE service_date >= ${day90Ago}
      GROUP BY provider_id, patient_id, hospital
    `);

    this.tripletFrequencyCache.clear();
    this.totalTripletsCount = 0;

    for (const row of (tripletCounts as any).rows || []) {
      const triplet = row.triplet as string;
      const count = parseInt(row.cnt?.toString() || '0', 10);
      this.tripletFrequencyCache.set(triplet, count);
      this.totalTripletsCount += count;
    }

    this.cacheExpiry = Date.now() + this.CACHE_TTL_MS;
  }
}

export const networkFeatureService = new NetworkFeatureService();
