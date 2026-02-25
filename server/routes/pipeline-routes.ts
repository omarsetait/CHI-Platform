import { Express } from "express";
import { runFullPipeline, getPipelineProgress, PipelineResult, runBulkSqlDetection, runBulkSemanticDetection, runBulkRagLlmDetection, runCompleteBulkDetection } from "../services/fwa-pipeline-service";
import { db } from "../db";
import { sql } from "drizzle-orm";

let pipelineRunning = false;
let lastPipelineResult: PipelineResult | null = null;

export function isPipelineRunning(): boolean {
  return pipelineRunning;
}

export function setPipelineRunning(running: boolean): void {
  pipelineRunning = running;
}

export function setLastPipelineResult(result: PipelineResult | null): void {
  lastPipelineResult = result;
}

export function registerPipelineRoutes(app: Express) {
  
  app.get("/api/pipeline/trigger", async (req, res) => {
    try {
      if (pipelineRunning) {
        const progress = getPipelineProgress();
        return res.status(409).json({ 
          error: "Pipeline already running",
          progress
        });
      }

      pipelineRunning = true;
      res.json({ 
        message: "Pipeline started",
        status: "running"
      });

      runFullPipeline()
        .then(result => {
          lastPipelineResult = result;
          pipelineRunning = false;
          console.log("[Pipeline] Trigger run complete:", result.success ? "SUCCESS" : "FAILED");
        })
        .catch(err => {
          pipelineRunning = false;
          console.error("[Pipeline] Trigger run error:", err);
        });
    } catch (error) {
      pipelineRunning = false;
      console.error("[Pipeline] Trigger error:", error);
      res.status(500).json({ error: "Failed to trigger pipeline" });
    }
  });

  app.get("/api/pipeline/info", async (req, res) => {
    try {
      const stats = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM claims) as total_claims,
          (SELECT COUNT(*) FROM fwa_analyzed_claims) as analyzed_claims,
          (SELECT COUNT(*) FROM fwa_detection_results) as claim_detections,
          (SELECT COUNT(*) FROM fwa_provider_detection_results) as provider_detections,
          (SELECT COUNT(*) FROM fwa_patient_detection_results) as patient_detections,
          (SELECT COUNT(*) FROM fwa_doctor_detection_results) as doctor_detections
      `);

      const row = stats.rows[0] as any;
      const progress = getPipelineProgress();
      
      res.json({
        running: pipelineRunning,
        progress,
        lastResult: lastPipelineResult,
        stats: {
          totalClaims: parseInt(row.total_claims) || 0,
          analyzedClaims: parseInt(row.analyzed_claims) || 0,
          claimDetections: parseInt(row.claim_detections) || 0,
          providerDetections: parseInt(row.provider_detections) || 0,
          patientDetections: parseInt(row.patient_detections) || 0,
          doctorDetections: parseInt(row.doctor_detections) || 0
        }
      });
    } catch (error) {
      console.error("[Pipeline] Info error:", error);
      res.status(500).json({ error: "Failed to get pipeline info" });
    }
  });

  app.post("/api/pipeline/run", async (req, res) => {
    try {
      if (pipelineRunning) {
        const progress = getPipelineProgress();
        return res.status(409).json({ 
          error: "Pipeline already running",
          progress
        });
      }

      const { claimIds, async: runAsync = true } = req.body;

      if (runAsync) {
        pipelineRunning = true;
        res.json({ 
          message: "Pipeline started",
          status: "running",
          checkProgressAt: "/api/pipeline/status"
        });

        runFullPipeline(claimIds)
          .then(result => {
            lastPipelineResult = result;
            pipelineRunning = false;
            console.log("[Pipeline] Async run complete:", result.success ? "SUCCESS" : "FAILED");
          })
          .catch(err => {
            pipelineRunning = false;
            console.error("[Pipeline] Async run error:", err);
          });
      } else {
        pipelineRunning = true;
        const result = await runFullPipeline(claimIds);
        pipelineRunning = false;
        lastPipelineResult = result;
        res.json(result);
      }
    } catch (error) {
      pipelineRunning = false;
      console.error("[Pipeline] Route error:", error);
      res.status(500).json({ error: "Failed to run pipeline" });
    }
  });

  // Bulk SQL-based detection for high-performance processing
  app.post("/api/pipeline/bulk-detect", async (req, res) => {
    try {
      if (pipelineRunning) {
        return res.status(409).json({ 
          error: "Pipeline already running",
          progress: getPipelineProgress()
        });
      }

      const { batchSize = 100000, async: runAsync = true } = req.body;

      if (runAsync) {
        pipelineRunning = true;
        res.json({ 
          message: "Bulk SQL detection started",
          status: "running",
          batchSize,
          checkProgressAt: "/api/pipeline/status"
        });

        runBulkSqlDetection(batchSize)
          .then(result => {
            pipelineRunning = false;
            console.log("[Pipeline] Bulk SQL detection complete:", result);
          })
          .catch(err => {
            pipelineRunning = false;
            console.error("[Pipeline] Bulk SQL detection error:", err);
          });
      } else {
        pipelineRunning = true;
        const result = await runBulkSqlDetection(batchSize);
        pipelineRunning = false;
        res.json({
          success: true,
          result
        });
      }
    } catch (error) {
      pipelineRunning = false;
      console.error("[Pipeline] Bulk detect error:", error);
      res.status(500).json({ error: "Failed to run bulk detection" });
    }
  });

  // Complete 5-method bulk detection (Rule + Statistical + Unsupervised + Semantic + RAG/LLM)
  app.post("/api/pipeline/complete-detection", async (req, res) => {
    try {
      if (pipelineRunning) {
        return res.status(409).json({ 
          error: "Pipeline already running",
          progress: getPipelineProgress()
        });
      }

      const { async: runAsync = true } = req.body;

      if (runAsync) {
        pipelineRunning = true;
        res.json({ 
          message: "Complete 5-method detection started",
          status: "running",
          methods: ["rule_engine", "statistical", "unsupervised", "semantic", "rag_llm"],
          checkProgressAt: "/api/pipeline/status"
        });

        runCompleteBulkDetection()
          .then(result => {
            pipelineRunning = false;
            console.log("[Pipeline] Complete detection finished:", result);
          })
          .catch(err => {
            pipelineRunning = false;
            console.error("[Pipeline] Complete detection error:", err);
          });
      } else {
        pipelineRunning = true;
        const result = await runCompleteBulkDetection();
        pipelineRunning = false;
        res.json({
          success: true,
          result
        });
      }
    } catch (error) {
      pipelineRunning = false;
      console.error("[Pipeline] Complete detection error:", error);
      res.status(500).json({ error: "Failed to run complete detection" });
    }
  });

  app.get("/api/pipeline/status", async (req, res) => {
    try {
      const progress = getPipelineProgress();
      
      res.json({
        running: pipelineRunning,
        progress,
        lastResult: lastPipelineResult
      });
    } catch (error) {
      console.error("[Pipeline] Status error:", error);
      res.status(500).json({ error: "Failed to get pipeline status" });
    }
  });

  app.get("/api/pipeline/stats", async (req, res) => {
    try {
      const stats = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM claims) as total_claims,
          (SELECT COUNT(*) FROM fwa_analyzed_claims) as analyzed_claims,
          (SELECT COUNT(*) FROM fwa_detection_results) as claim_detections,
          (SELECT COUNT(*) FROM fwa_provider_detection_results) as provider_detections,
          (SELECT COUNT(*) FROM fwa_patient_detection_results) as patient_detections,
          (SELECT COUNT(*) FROM fwa_doctor_detection_results) as doctor_detections,
          (SELECT COUNT(*) FROM fwa_feature_store WHERE entity_type = 'provider') as provider_features,
          (SELECT COUNT(*) FROM fwa_feature_store WHERE entity_type = 'patient') as patient_features,
          (SELECT COUNT(*) FROM fwa_feature_store WHERE entity_type = 'doctor') as doctor_features,
          (SELECT COUNT(*) FROM fwa_detection_results WHERE composite_risk_level IN ('high', 'critical')) as high_risk_claims,
          (SELECT COUNT(*) FROM fwa_provider_detection_results WHERE risk_level IN ('high', 'critical')) as high_risk_providers,
          (SELECT COUNT(*) FROM fwa_patient_detection_results WHERE risk_level IN ('high', 'critical')) as high_risk_patients,
          (SELECT COUNT(*) FROM fwa_doctor_detection_results WHERE risk_level IN ('high', 'critical')) as high_risk_doctors
      `);

      const row = stats.rows[0] as any;
      
      const totalClaims = parseInt(row.total_claims) || 0;
      const analyzedClaims = parseInt(row.analyzed_claims) || 0;
      const claimDetections = parseInt(row.claim_detections) || 0;

      res.json({
        claims: {
          total: totalClaims,
          analyzed: analyzedClaims,
          detectionResults: claimDetections,
          pendingAnalysis: totalClaims - analyzedClaims,
          pendingDetection: analyzedClaims - claimDetections,
          completionPercent: totalClaims > 0 ? Math.round((claimDetections / totalClaims) * 100) : 0
        },
        entities: {
          providers: {
            features: parseInt(row.provider_features) || 0,
            detections: parseInt(row.provider_detections) || 0,
            highRisk: parseInt(row.high_risk_providers) || 0
          },
          patients: {
            features: parseInt(row.patient_features) || 0,
            detections: parseInt(row.patient_detections) || 0,
            highRisk: parseInt(row.high_risk_patients) || 0
          },
          doctors: {
            features: parseInt(row.doctor_features) || 0,
            detections: parseInt(row.doctor_detections) || 0,
            highRisk: parseInt(row.high_risk_doctors) || 0
          }
        },
        summary: {
          totalHighRiskClaims: parseInt(row.high_risk_claims) || 0,
          totalHighRiskEntities: 
            (parseInt(row.high_risk_providers) || 0) + 
            (parseInt(row.high_risk_patients) || 0) + 
            (parseInt(row.high_risk_doctors) || 0),
          pipelineComplete: claimDetections >= totalClaims && totalClaims > 0
        }
      });
    } catch (error) {
      console.error("[Pipeline] Stats error:", error);
      res.status(500).json({ error: "Failed to get pipeline stats" });
    }
  });

  app.post("/api/pipeline/reset", async (req, res) => {
    try {
      const { target = "all" } = req.body;

      if (pipelineRunning) {
        return res.status(409).json({ error: "Cannot reset while pipeline is running" });
      }

      let clearedTables: string[] = [];

      if (target === "all" || target === "detections") {
        await db.execute(sql`TRUNCATE TABLE fwa_detection_results RESTART IDENTITY CASCADE`);
        await db.execute(sql`TRUNCATE TABLE fwa_provider_detection_results RESTART IDENTITY CASCADE`);
        await db.execute(sql`TRUNCATE TABLE fwa_patient_detection_results RESTART IDENTITY CASCADE`);
        await db.execute(sql`TRUNCATE TABLE fwa_doctor_detection_results RESTART IDENTITY CASCADE`);
        clearedTables.push("fwa_detection_results", "fwa_provider_detection_results", "fwa_patient_detection_results", "fwa_doctor_detection_results");
      }

      if (target === "all" || target === "features") {
        await db.execute(sql`DELETE FROM fwa_feature_store`);
        clearedTables.push("fwa_feature_store");
      }

      if (target === "all" || target === "analyzed") {
        await db.execute(sql`TRUNCATE TABLE fwa_analyzed_claims RESTART IDENTITY CASCADE`);
        clearedTables.push("fwa_analyzed_claims");
      }

      lastPipelineResult = null;

      res.json({ 
        success: true, 
        message: `Cleared ${clearedTables.length} tables`,
        clearedTables 
      });
    } catch (error) {
      console.error("[Pipeline] Reset error:", error);
      res.status(500).json({ error: "Failed to reset pipeline data" });
    }
  });

  console.log("[Pipeline] Routes registered");
}

export { pipelineRunning };
