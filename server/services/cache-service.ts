/**
 * In-Memory Cache Service for FWA Dashboard
 * Provides caching for expensive aggregation queries
 * TTL-based expiration for stale data management
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
  hitCount: number;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsageBytes: number;
}

class FWACacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private hits = 0;
  private misses = 0;
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize = 1000, defaultTTLSeconds = 300) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTLSeconds * 1000;
    
    // Periodic cleanup of expired entries
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get a cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    entry.hitCount++;
    this.hits++;
    return entry.data as T;
  }

  /**
   * Set a cached value
   */
  set<T>(key: string, data: T, ttlSeconds?: number): void {
    // Evict if at capacity (LRU-like: remove oldest)
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;
    
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
      hitCount: 0
    });
  }

  /**
   * Get or compute a value (cache-aside pattern)
   */
  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await computeFn();
    this.set(key, data, ttlSeconds);
    return data;
  }

  /**
   * Invalidate a specific key
   */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a pattern
   */
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let count = 0;
    
    for (const key of Array.from(this.cache.keys())) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`[Cache] Cleaned up ${expiredCount} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    
    // Rough memory estimate
    let memoryEstimate = 0;
    for (const [key, entry] of Array.from(this.cache.entries())) {
      memoryEstimate += key.length * 2; // String overhead
      memoryEstimate += JSON.stringify(entry.data).length * 2;
      memoryEstimate += 64; // Entry metadata
    }
    
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
      memoryUsageBytes: memoryEstimate
    };
  }
}

// Singleton instance with 5-minute default TTL
export const fwaCache = new FWACacheService(1000, 300);

// ===========================================
// CACHE KEY BUILDERS
// ===========================================

export const CacheKeys = {
  // Dashboard statistics
  dashboardStats: () => "dashboard:stats",
  dashboardKPIs: () => "dashboard:kpis",
  
  // Provider-level caches
  providerStats: (providerId: string) => `provider:${providerId}:stats`,
  providerClaims: (providerId: string, page: number) => `provider:${providerId}:claims:${page}`,
  providerRiskScore: (providerId: string) => `provider:${providerId}:risk`,
  
  // FWA case caches
  fwaCasesList: (page: number, filters: string) => `fwa:cases:${page}:${filters}`,
  fwaCaseDetail: (caseId: string) => `fwa:case:${caseId}`,
  
  // Aggregate statistics
  specialtyBaselines: () => "stats:specialty:baselines",
  populationStats: () => "stats:population",
  monthlyTrends: (months: number) => `stats:trends:${months}`,
  
  // Rule evaluation caches
  ruleResults: (claimId: string) => `rule:results:${claimId}`,
  
  // KPI caches
  kpiValue: (kpiId: string) => `kpi:${kpiId}:value`,
  kpiTrend: (kpiId: string, days: number) => `kpi:${kpiId}:trend:${days}`,
};

// ===========================================
// CACHE DECORATORS FOR COMMON OPERATIONS
// ===========================================

/**
 * Decorator-like function to cache expensive operations
 */
export function withCache<T>(
  keyFn: (...args: any[]) => string,
  ttlSeconds = 300
) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const key = keyFn(...args);
      
      return fwaCache.getOrCompute(key, () => originalMethod.apply(this, args), ttlSeconds);
    };
    
    return descriptor;
  };
}

// ===========================================
// CACHE WARMING FUNCTIONS
// ===========================================

/**
 * Warm cache with commonly accessed data
 * Call this on application startup or after bulk ingestion
 */
export async function warmFWACache(
  computeFunctions: {
    getDashboardStats?: () => Promise<any>;
    getSpecialtyBaselines?: () => Promise<any>;
    getPopulationStats?: () => Promise<any>;
  }
): Promise<{ warmedKeys: string[]; errors: string[] }> {
  const warmedKeys: string[] = [];
  const errors: string[] = [];

  if (computeFunctions.getDashboardStats) {
    try {
      const data = await computeFunctions.getDashboardStats();
      fwaCache.set(CacheKeys.dashboardStats(), data, 600);
      warmedKeys.push(CacheKeys.dashboardStats());
    } catch (e: any) {
      errors.push(`Dashboard stats: ${e.message}`);
    }
  }

  if (computeFunctions.getSpecialtyBaselines) {
    try {
      const data = await computeFunctions.getSpecialtyBaselines();
      fwaCache.set(CacheKeys.specialtyBaselines(), data, 3600);
      warmedKeys.push(CacheKeys.specialtyBaselines());
    } catch (e: any) {
      errors.push(`Specialty baselines: ${e.message}`);
    }
  }

  if (computeFunctions.getPopulationStats) {
    try {
      const data = await computeFunctions.getPopulationStats();
      fwaCache.set(CacheKeys.populationStats(), data, 3600);
      warmedKeys.push(CacheKeys.populationStats());
    } catch (e: any) {
      errors.push(`Population stats: ${e.message}`);
    }
  }

  console.log(`[Cache] Warmed ${warmedKeys.length} keys, ${errors.length} errors`);
  return { warmedKeys, errors };
}
