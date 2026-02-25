/**
 * ETL API Routes for Bulk Data Ingestion
 * Handles large-scale data uploads with validation and progress tracking
 */

import { Express, Request, Response } from "express";
import { z } from "zod";
import {
  bulkIngestClaims,
  bulkIngestProviders,
  bulkIngestDoctors,
  bulkIngestPatients,
  getETLProgress,
  refreshMaterializedViews,
  getDatabaseStats,
} from "../services/etl-ingestion-service";
import { fwaCache, CacheKeys } from "../services/cache-service";

// Validation schemas
const bulkUploadOptionsSchema = z.object({
  skipDuplicates: z.boolean().optional().default(true),
  batchSize: z.number().min(10).max(1000).optional().default(500),
});

export function registerETLRoutes(app: Express) {
  
  // ===========================================
  // BULK INGESTION ENDPOINTS
  // ===========================================

  /**
   * Bulk upload claims
   * POST /api/etl/claims/bulk
   */
  app.post("/api/etl/claims/bulk", async (req: Request, res: Response) => {
    try {
      const { records, options } = req.body;
      
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({
          error: "Records array is required and must not be empty",
          code: "INVALID_INPUT"
        });
      }

      if (records.length > 50000) {
        return res.status(400).json({
          error: "Maximum 50,000 records per batch. Split into multiple requests.",
          code: "BATCH_TOO_LARGE"
        });
      }

      const parsedOptions = bulkUploadOptionsSchema.parse(options || {});
      
      console.log(`[ETL] Starting bulk claims ingestion: ${records.length} records`);
      
      const result = await bulkIngestClaims(records, {
        skipDuplicates: parsedOptions.skipDuplicates,
        batchSize: parsedOptions.batchSize,
      });

      // Invalidate related caches
      fwaCache.invalidatePattern("dashboard:");
      fwaCache.invalidatePattern("stats:");
      fwaCache.invalidatePattern("provider:");

      console.log(`[ETL] Claims ingestion complete: ${result.successCount}/${result.totalRecords} success`);
      
      res.json({
        ...result,
        message: `تم معالجة ${result.successCount} من ${result.totalRecords} سجل مطالبة`
      });
    } catch (error: any) {
      console.error("[ETL] Claims bulk upload error:", error);
      res.status(500).json({
        error: error.message,
        code: "ETL_ERROR"
      });
    }
  });

  /**
   * Bulk upload providers
   * POST /api/etl/providers/bulk
   */
  app.post("/api/etl/providers/bulk", async (req: Request, res: Response) => {
    try {
      const { records, options } = req.body;
      
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({
          error: "Records array is required",
          code: "INVALID_INPUT"
        });
      }

      const parsedOptions = bulkUploadOptionsSchema.parse(options || {});
      
      console.log(`[ETL] Starting bulk providers ingestion: ${records.length} records`);
      
      const result = await bulkIngestProviders(records, parsedOptions);

      fwaCache.invalidatePattern("provider:");
      
      res.json({
        ...result,
        message: `تم معالجة ${result.successCount} من ${result.totalRecords} مقدم خدمة`
      });
    } catch (error: any) {
      console.error("[ETL] Providers bulk upload error:", error);
      res.status(500).json({ error: error.message, code: "ETL_ERROR" });
    }
  });

  /**
   * Bulk upload doctors
   * POST /api/etl/doctors/bulk
   */
  app.post("/api/etl/doctors/bulk", async (req: Request, res: Response) => {
    try {
      const { records, options } = req.body;
      
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({
          error: "Records array is required",
          code: "INVALID_INPUT"
        });
      }

      const parsedOptions = bulkUploadOptionsSchema.parse(options || {});
      
      console.log(`[ETL] Starting bulk doctors ingestion: ${records.length} records`);
      
      const result = await bulkIngestDoctors(records, parsedOptions);
      
      res.json({
        ...result,
        message: `تم معالجة ${result.successCount} من ${result.totalRecords} طبيب`
      });
    } catch (error: any) {
      console.error("[ETL] Doctors bulk upload error:", error);
      res.status(500).json({ error: error.message, code: "ETL_ERROR" });
    }
  });

  /**
   * Bulk upload patients
   * POST /api/etl/patients/bulk
   */
  app.post("/api/etl/patients/bulk", async (req: Request, res: Response) => {
    try {
      const { records, options } = req.body;
      
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({
          error: "Records array is required",
          code: "INVALID_INPUT"
        });
      }

      const parsedOptions = bulkUploadOptionsSchema.parse(options || {});
      
      console.log(`[ETL] Starting bulk patients ingestion: ${records.length} records`);
      
      const result = await bulkIngestPatients(records, parsedOptions);
      
      res.json({
        ...result,
        message: `تم معالجة ${result.successCount} من ${result.totalRecords} مريض`
      });
    } catch (error: any) {
      console.error("[ETL] Patients bulk upload error:", error);
      res.status(500).json({ error: error.message, code: "ETL_ERROR" });
    }
  });

  // ===========================================
  // PROGRESS & MONITORING ENDPOINTS
  // ===========================================

  /**
   * Get ETL job progress
   * GET /api/etl/progress/:batchId
   */
  app.get("/api/etl/progress/:batchId", (req: Request, res: Response) => {
    const { batchId } = req.params;
    const progress = getETLProgress(batchId);
    
    if (!progress) {
      return res.status(404).json({
        error: "Batch not found",
        code: "BATCH_NOT_FOUND"
      });
    }
    
    res.json(progress);
  });

  /**
   * Refresh materialized views
   * POST /api/etl/refresh-views
   */
  app.post("/api/etl/refresh-views", async (_req: Request, res: Response) => {
    try {
      console.log("[ETL] Refreshing materialized views...");
      const result = await refreshMaterializedViews();
      
      // Also clear caches
      fwaCache.invalidateAll();
      
      res.json({
        ...result,
        message: result.success 
          ? "تم تحديث العروض المادية بنجاح" 
          : "فشل تحديث العروض المادية"
      });
    } catch (error: any) {
      console.error("[ETL] Refresh views error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get database statistics
   * GET /api/etl/stats
   */
  app.get("/api/etl/stats", async (_req: Request, res: Response) => {
    try {
      const stats = await getDatabaseStats();
      const cacheStats = fwaCache.getStats();
      
      res.json({
        database: stats,
        cache: cacheStats,
        message: "إحصائيات قاعدة البيانات"
      });
    } catch (error: any) {
      console.error("[ETL] Stats error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Clear all caches
   * POST /api/etl/clear-cache
   */
  app.post("/api/etl/clear-cache", (_req: Request, res: Response) => {
    fwaCache.invalidateAll();
    res.json({
      success: true,
      message: "تم مسح جميع البيانات المؤقتة"
    });
  });

  // ===========================================
  // KEYSET PAGINATION HELPER ENDPOINTS
  // ===========================================

  /**
   * Get claims with keyset pagination (for large datasets)
   * GET /api/etl/claims/paginated
   * Query params: cursor, limit, providerId, status, flagged
   */
  app.get("/api/etl/claims/paginated", async (req: Request, res: Response) => {
    try {
      const {
        cursor,
        limit = "100",
        providerId,
        status,
        flagged,
        orderBy = "service_date",
        order = "desc"
      } = req.query;

      const pageLimit = Math.min(parseInt(limit as string) || 100, 1000);
      const orderDirection = order === "asc" ? "ASC" : "DESC";
      
      // Build WHERE clause
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (cursor) {
        // Keyset pagination: use cursor as the last seen ID
        conditions.push(`id ${order === "asc" ? ">" : "<"} $${paramIndex++}`);
        params.push(cursor);
      }

      if (providerId) {
        conditions.push(`provider_id = $${paramIndex++}`);
        params.push(providerId);
      }

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      if (flagged !== undefined) {
        conditions.push(`flagged = $${paramIndex++}`);
        params.push(flagged === "true");
      }

      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(" AND ")}` 
        : "";

      // Use raw SQL for optimal performance
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      
      const query = sql.raw(`
        SELECT * FROM claims 
        ${whereClause}
        ORDER BY ${orderBy} ${orderDirection}, id ${orderDirection}
        LIMIT ${pageLimit + 1}
      `);

      const result = await db.execute(query);
      const rows = result.rows as any[];
      
      // Check if there are more results
      const hasMore = rows.length > pageLimit;
      const data = hasMore ? rows.slice(0, pageLimit) : rows;
      const nextCursor = hasMore ? data[data.length - 1]?.id : null;

      res.json({
        data,
        pagination: {
          hasMore,
          nextCursor,
          limit: pageLimit,
          count: data.length
        }
      });
    } catch (error: any) {
      console.error("[ETL] Paginated claims error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get FWA cases with keyset pagination
   * GET /api/etl/fwa-cases/paginated
   */
  app.get("/api/etl/fwa-cases/paginated", async (req: Request, res: Response) => {
    try {
      const {
        cursor,
        limit = "50",
        providerId,
        status,
        riskLevel
      } = req.query;

      const pageLimit = Math.min(parseInt(limit as string) || 50, 500);
      
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (cursor) {
        conditions.push(`id < $${paramIndex++}`);
        params.push(cursor);
      }

      if (providerId) {
        conditions.push(`provider_id = $${paramIndex++}`);
        params.push(providerId);
      }

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      if (riskLevel) {
        conditions.push(`risk_level = $${paramIndex++}`);
        params.push(riskLevel);
      }

      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(" AND ")}` 
        : "";

      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      
      const query = sql.raw(`
        SELECT * FROM fwa_cases 
        ${whereClause}
        ORDER BY created_at DESC, id DESC
        LIMIT ${pageLimit + 1}
      `);

      const result = await db.execute(query);
      const rows = result.rows as any[];
      
      const hasMore = rows.length > pageLimit;
      const data = hasMore ? rows.slice(0, pageLimit) : rows;
      const nextCursor = hasMore ? data[data.length - 1]?.id : null;

      res.json({
        data,
        pagination: {
          hasMore,
          nextCursor,
          limit: pageLimit,
          count: data.length
        }
      });
    } catch (error: any) {
      console.error("[ETL] Paginated FWA cases error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  console.log("[ETL] Routes registered successfully");
}
