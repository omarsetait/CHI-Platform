import type { Express } from "express";
import type { IStorage } from "../storage";
import multer from "multer";
import {
  demoProviders,
  demoPatients,
  demoDoctors,
  demoFwaCases,
  demoPreAuthClaims,
  demoClaims,
  demoClaimsRules,
  demoQAFindings,
  demoProviderContracts,
  demoProviderCommunications,
  demoReconciliationRecords,
  getClaimById,
  getRuleById,
  getContractByProviderId,
} from "../services/demo-data-seeder";
import { updateFwaExemplars, updateClaimsExemplars } from "../services/agent-orchestrator";
import { importClaimsFromExcel, getImportStats } from "../services/claim-import-service";
import { runFullPipeline } from "../services/fwa-pipeline-service";
import { isPipelineRunning, setPipelineRunning, setLastPipelineResult } from "../routes/pipeline-routes";
import type { InsertRlhfFeedback } from "@shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream'
    ];
    const allowedExts = ['.xlsx', '.xls'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

export function registerClaimsRoutes(
  app: Express,
  storage: IStorage,
  handleRouteError: (res: any, error: unknown, routePath: string, operation?: string) => void
) {
  // Demo Data Endpoints
  app.get("/api/demo/providers", async (req, res) => {
    res.json(demoProviders);
  });

  app.get("/api/demo/patients", async (req, res) => {
    res.json(demoPatients);
  });

  app.get("/api/demo/doctors", async (req, res) => {
    res.json(demoDoctors);
  });

  app.get("/api/demo/fwa-cases", async (req, res) => {
    res.json(demoFwaCases);
  });

  app.get("/api/demo/pre-auth-claims", async (req, res) => {
    res.json(demoPreAuthClaims);
  });

  app.get("/api/demo/claims", async (req, res) => {
    res.json(demoClaims);
  });

  app.get("/api/demo/claims/:id", async (req, res) => {
    const claim = getClaimById(req.params.id);
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }
    res.json(claim);
  });

  app.get("/api/demo/rules", async (req, res) => {
    res.json(demoClaimsRules);
  });

  app.get("/api/demo/rules/:id", async (req, res) => {
    const rule = getRuleById(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: "Rule not found" });
    }
    res.json(rule);
  });

  app.get("/api/demo/qa-findings", async (req, res) => {
    res.json(demoQAFindings);
  });

  app.get("/api/demo/contracts", async (req, res) => {
    res.json(demoProviderContracts);
  });

  app.get("/api/demo/contracts/provider/:providerId", async (req, res) => {
    const contract = getContractByProviderId(req.params.providerId);
    if (!contract) {
      return res.status(404).json({ error: "Contract not found for provider" });
    }
    res.json(contract);
  });

  app.get("/api/demo/communications", async (req, res) => {
    res.json(demoProviderCommunications);
  });

  app.get("/api/demo/reconciliation", async (req, res) => {
    res.json(demoReconciliationRecords);
  });

  // Production Claims Endpoints - Database backed
  app.get("/api/claims", async (req, res) => {
    try {
      const { search, limit, offset, status } = req.query;
      const result = await storage.getClaims({
        search: search as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
        status: status as string,
      });
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/claims", "fetch claims");
    }
  });

  app.get("/api/claims/:id", async (req, res) => {
    try {
      const claim = await storage.getClaimById(req.params.id);
      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }
      res.json(claim);
    } catch (error) {
      handleRouteError(res, error, "/api/claims/:id", "fetch claim");
    }
  });

  // Claims Import Routes
  app.post("/api/claims/import", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const options = {
        sheetName: req.body.sheetName as string | undefined,
        startRow: req.body.startRow ? parseInt(req.body.startRow) : undefined,
        maxRows: req.body.maxRows ? parseInt(req.body.maxRows) : undefined,
        validateOnly: req.body.validateOnly === 'true'
      };

      const result = await importClaimsFromExcel(req.file.buffer, options);
      
      // Auto-trigger FWA pipeline after successful import (async)
      if (result.success && result.importedRows && result.importedRows > 0) {
        if (isPipelineRunning()) {
          console.log(`[Claims Import] Pipeline already running, skipping auto-trigger`);
        } else {
          console.log(`[Claims Import] Successfully imported ${result.importedRows} claims. Triggering FWA pipeline...`);
          setPipelineRunning(true);
          runFullPipeline()
            .then(pipelineResult => {
              setLastPipelineResult(pipelineResult);
              setPipelineRunning(false);
              console.log(`[Claims Import] Pipeline complete: ${pipelineResult.success ? 'SUCCESS' : 'FAILED'}`);
            })
            .catch(err => {
              setPipelineRunning(false);
              console.error(`[Claims Import] Pipeline error:`, err);
            });
        }
      }
      
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/claims/import", "import claims from Excel");
    }
  });

  app.get("/api/claims/import/stats", async (req, res) => {
    try {
      const stats = await getImportStats();
      res.json(stats);
    } catch (error) {
      handleRouteError(res, error, "/api/claims/import/stats", "fetch import statistics");
    }
  });

  // CSV Import endpoint for large files
  app.post("/api/claims/import-csv", async (req, res) => {
    try {
      const { csvPath, maxRows } = req.body;
      
      if (!csvPath) {
        return res.status(400).json({ error: "csvPath is required" });
      }
      
      const { importClaimsFromCSV } = await import("../services/claim-import-service");
      const result = await importClaimsFromCSV(csvPath, { maxRows });
      
      // Auto-trigger FWA pipeline after successful import
      if (result.success && result.importedRows > 0) {
        if (isPipelineRunning()) {
          console.log(`[CSV Import] Pipeline already running, skipping auto-trigger`);
        } else {
          console.log(`[CSV Import] Successfully imported ${result.importedRows} claims. Triggering FWA pipeline...`);
          setPipelineRunning(true);
          runFullPipeline()
            .then(pipelineResult => {
              setLastPipelineResult(pipelineResult);
              setPipelineRunning(false);
              console.log(`[CSV Import] Pipeline complete: ${pipelineResult.success ? 'SUCCESS' : 'FAILED'}`);
            })
            .catch(err => {
              setPipelineRunning(false);
              console.error(`[CSV Import] Pipeline error:`, err);
            });
        }
      }
      
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/claims/import-csv", "import claims from CSV");
    }
  });

  // RLHF Feedback Routes - Now using database persistence
  app.post("/api/fwa/actions", async (req, res) => {
    try {
      const {
        caseId,
        entityId,
        entityType,
        agentId,
        phase,
        aiRecommendation,
        humanAction,
        wasAccepted,
        overrideReason,
        reviewerNotes,
        reviewerId,
        detectionMethod,
        originalScore,
      } = req.body;

      if (!caseId || !humanAction || !phase) {
        return res.status(400).json({ error: "Missing required fields: caseId, humanAction, phase" });
      }

      const feedbackData: InsertRlhfFeedback = {
        module: "fwa",
        caseId,
        entityId: entityId || caseId,
        entityType: entityType || "case",
        agentId,
        phase,
        aiRecommendation,
        humanAction,
        wasAccepted: wasAccepted || false,
        overrideReason,
        reviewerNotes,
        reviewerId: reviewerId || "demo-reviewer",
        outcome: "pending",
        preferenceScore: wasAccepted ? 1 : -1,
        curatedForTraining: false,
        detectionMethod,
        originalScore,
      };

      const feedbackEvent = await storage.createRlhfFeedback(feedbackData);
      console.log(`[RLHF] FWA Action recorded to DB: ${humanAction} on case ${caseId}, accepted: ${wasAccepted}`);

      if (wasAccepted) {
        const allFeedback = await storage.getRlhfFeedback("fwa", { limit: 10 });
        const acceptedExemplars = allFeedback
          .filter(e => e.wasAccepted)
          .map(e => ({
            action: e.humanAction,
            context: e.aiRecommendation,
            notes: e.reviewerNotes || undefined,
            entityType: e.entityType,
            phase: e.phase || undefined,
          }));
        updateFwaExemplars(acceptedExemplars);
        console.log(`[RLHF] Updated FWA exemplars with ${acceptedExemplars.length} accepted actions`);
      }

      res.status(201).json({
        success: true,
        feedbackId: feedbackEvent.id,
        message: `Action "${humanAction}" recorded successfully`,
        feedbackEvent,
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/actions", "record FWA action");
    }
  });

  app.post("/api/claims/actions", async (req, res) => {
    try {
      const {
        claimId,
        entityId,
        entityType,
        agentId,
        adjudicationPhase,
        phase,
        aiRecommendation,
        humanAction,
        wasAccepted,
        overrideReason,
        reviewerNotes,
        reviewerId,
        detectionMethod,
        originalScore,
      } = req.body;

      if (!claimId || !humanAction) {
        return res.status(400).json({ error: "Missing required fields: claimId, humanAction" });
      }

      const feedbackData: InsertRlhfFeedback = {
        module: "claims",
        claimId,
        entityId: entityId || claimId,
        entityType: entityType || "claim",
        agentId,
        adjudicationPhase: adjudicationPhase || parseInt(phase) || 1,
        phase: String(adjudicationPhase || phase || "1"),
        aiRecommendation,
        humanAction,
        wasAccepted: wasAccepted || false,
        overrideReason,
        reviewerNotes,
        reviewerId: reviewerId || "demo-reviewer",
        outcome: "pending",
        preferenceScore: wasAccepted ? 1 : -1,
        curatedForTraining: false,
        detectionMethod,
        originalScore,
      };

      const feedbackEvent = await storage.createRlhfFeedback(feedbackData);
      console.log(`[RLHF] Claims Action recorded to DB: ${humanAction} on claim ${claimId}, accepted: ${wasAccepted}`);

      if (wasAccepted) {
        const allFeedback = await storage.getRlhfFeedback("claims", { limit: 10 });
        const acceptedExemplars = allFeedback
          .filter(e => e.wasAccepted)
          .map(e => ({
            action: e.humanAction,
            context: e.aiRecommendation,
            notes: e.reviewerNotes || undefined,
            entityType: e.entityType,
            phase: e.phase || String(e.adjudicationPhase || "1"),
          }));
        updateClaimsExemplars(acceptedExemplars);
        console.log(`[RLHF] Updated Claims exemplars with ${acceptedExemplars.length} accepted actions`);
      }

      res.status(201).json({
        success: true,
        feedbackId: feedbackEvent.id,
        message: `Action "${humanAction}" recorded successfully`,
        feedbackEvent,
      });
    } catch (error) {
      handleRouteError(res, error, "/api/claims/actions", "record claims action");
    }
  });

  app.get("/api/rlhf/feedback/fwa", async (req, res) => {
    try {
      const { agentId, phase, limit } = req.query;
      const feedback = await storage.getRlhfFeedback("fwa", {
        agentId: agentId as string,
        phase: phase as string,
        limit: parseInt(limit as string) || 100,
      });
      res.json(feedback);
    } catch (error) {
      handleRouteError(res, error, "/api/rlhf/feedback/fwa", "fetch FWA feedback");
    }
  });

  app.get("/api/rlhf/feedback/claims", async (req, res) => {
    try {
      const { agentId, limit } = req.query;
      const feedback = await storage.getRlhfFeedback("claims", {
        agentId: agentId as string,
        limit: parseInt(limit as string) || 100,
      });
      res.json(feedback);
    } catch (error) {
      handleRouteError(res, error, "/api/rlhf/feedback/claims", "fetch claims feedback");
    }
  });

  app.get("/api/rlhf/metrics", async (req, res) => {
    try {
      const metrics = await storage.getRlhfMetrics();
      const allFeedback = await storage.getRlhfFeedback();

      const agentMetrics: Record<string, { total: number; accepted: number; rate: number }> = {};
      allFeedback.forEach(event => {
        const agentId = event.agentId || "unknown";
        if (!agentMetrics[agentId]) {
          agentMetrics[agentId] = { total: 0, accepted: 0, rate: 0 };
        }
        agentMetrics[agentId].total++;
        if (event.wasAccepted) {
          agentMetrics[agentId].accepted++;
        }
        agentMetrics[agentId].rate = agentMetrics[agentId].total > 0 
          ? Math.round((agentMetrics[agentId].accepted / agentMetrics[agentId].total) * 100) 
          : 0;
      });

      res.json({
        fwa: {
          totalActions: metrics.fwa.total,
          acceptedRecommendations: metrics.fwa.accepted,
          overriddenRecommendations: metrics.fwa.total - metrics.fwa.accepted,
          acceptanceRate: metrics.fwa.total > 0 ? Math.round((metrics.fwa.accepted / metrics.fwa.total) * 100) : 0,
        },
        claims: {
          totalActions: metrics.claims.total,
          acceptedRecommendations: metrics.claims.accepted,
          overriddenRecommendations: metrics.claims.total - metrics.claims.accepted,
          acceptanceRate: metrics.claims.total > 0 ? Math.round((metrics.claims.accepted / metrics.claims.total) * 100) : 0,
        },
        agentMetrics,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      handleRouteError(res, error, "/api/rlhf/metrics", "fetch RLHF metrics");
    }
  });

  app.get("/api/rlhf/exemplars/:module", async (req, res) => {
    try {
      const { module } = req.params;
      const { agentId, phase, limit } = req.query;
      
      const feedback = await storage.getRlhfFeedback(module as string, {
        agentId: agentId as string,
        phase: phase as string,
      });
      
      let exemplars = feedback
        .filter(e => e.wasAccepted)
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
      
      const resultLimit = parseInt(limit as string) || 5;
      
      res.json({
        exemplars: exemplars.slice(0, resultLimit).map(e => ({
          action: e.humanAction,
          context: e.aiRecommendation,
          notes: e.reviewerNotes,
          entityType: e.entityType,
          phase: e.phase,
        })),
        totalAvailable: exemplars.length,
      });
    } catch (error) {
      handleRouteError(res, error, "/api/rlhf/exemplars/:module", "fetch exemplars");
    }
  });
}

export async function registerClaimsPipelineRoutes(
  app: Express,
  handleRouteError: (res: any, error: unknown, routePath: string, operation?: string) => void
) {
  const { processClaimItem, processBatch, getScenarioFromClaim } = await import("../services/claims-pipeline");
  const { db } = await import("../db");
  const { claimIngestBatches, claimIngestItems, claimPipelineEvents } = await import("@shared/schema");
  const { eq: eqOp, desc: descOp } = await import("drizzle-orm");

  // POST /api/claims-pipeline/upload - Upload claims from file
  app.post("/api/claims-pipeline/upload", async (req, res) => {
    try {
      const { claims, fileName, fileType } = req.body;
      
      if (!claims || !Array.isArray(claims) || claims.length === 0) {
        return res.status(400).json({ error: "No claims provided" });
      }
      
      const [batch] = await db.insert(claimIngestBatches).values({
        batchName: `Upload ${new Date().toISOString()}`,
        sourceType: "file_upload",
        fileName: fileName || "upload.csv",
        fileType: fileType || "csv",
        totalClaims: claims.length,
        status: "pending",
      }).returning();
      
      const claimItems: any[] = [];
      for (const claim of claims) {
        const [item] = await db.insert(claimIngestItems).values({
          batchId: batch.id,
          claimNumber: claim.claimNumber || `CLM-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          patientId: claim.patientId || "PAT-1001",
          providerId: claim.providerId || "PRV-001",
          serviceDate: claim.serviceDate || new Date().toISOString().split("T")[0],
          procedureCode: claim.procedureCode || null,
          diagnosisCode: claim.diagnosisCode || null,
          amount: claim.amount?.toString() || "1000",
          description: claim.description || "Claim submission",
          rawData: claim,
          status: "pending",
        }).returning();
        claimItems.push(item);
      }
      
      res.json({
        batchId: batch.id,
        totalClaims: claims.length,
        claimIds: claimItems.map(c => c.id),
        message: "Claims uploaded successfully. Start processing to begin pipeline.",
      });
    } catch (error) {
      handleRouteError(res, error, "/api/claims-pipeline/upload", "upload claims");
    }
  });

  // POST /api/claims-pipeline/manual - Submit single claim manually
  app.post("/api/claims-pipeline/manual", async (req, res) => {
    try {
      const claim = req.body;
      
      if (!claim.patientId || !claim.providerId || !claim.amount) {
        return res.status(400).json({ error: "Missing required fields: patientId, providerId, amount" });
      }
      
      const [batch] = await db.insert(claimIngestBatches).values({
        batchName: `Manual Entry ${new Date().toISOString()}`,
        sourceType: "manual_entry",
        totalClaims: 1,
        status: "pending",
      }).returning();
      
      const [item] = await db.insert(claimIngestItems).values({
        batchId: batch.id,
        claimNumber: claim.claimNumber || `CLM-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        patientId: claim.patientId,
        providerId: claim.providerId,
        serviceDate: claim.serviceDate || new Date().toISOString().split("T")[0],
        procedureCode: claim.procedureCode || null,
        diagnosisCode: claim.diagnosisCode || null,
        amount: claim.amount.toString(),
        description: claim.description || "Manual claim entry",
        rawData: claim,
        status: "pending",
      }).returning();
      
      res.json({
        batchId: batch.id,
        claimId: item.id,
        predictedScenario: getScenarioFromClaim(item),
        message: "Claim created. Start processing to begin pipeline.",
      });
    } catch (error) {
      handleRouteError(res, error, "/api/claims-pipeline/manual", "create manual claim");
    }
  });

  // POST /api/claims-pipeline/:batchId/process - Start processing a batch
  app.post("/api/claims-pipeline/:batchId/process", async (req, res) => {
    try {
      const { batchId } = req.params;
      
      await db.update(claimIngestBatches)
        .set({ status: "processing" })
        .where(eqOp(claimIngestBatches.id, batchId));
      
      processBatch(batchId).catch(err => console.error("Batch processing error:", err));
      
      res.json({ 
        message: "Processing started",
        batchId,
        status: "processing",
      });
    } catch (error) {
      handleRouteError(res, error, "/api/claims-pipeline/:batchId/process", "start batch processing");
    }
  });

  // GET /api/claims-pipeline/batch/:batchId - Get batch status and items
  app.get("/api/claims-pipeline/batch/:batchId", async (req, res) => {
    try {
      const { batchId } = req.params;
      
      const [batch] = await db.select().from(claimIngestBatches).where(eqOp(claimIngestBatches.id, batchId));
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      
      const items = await db.select().from(claimIngestItems).where(eqOp(claimIngestItems.batchId, batchId));
      
      res.json({
        batch,
        items,
        progress: {
          total: items.length,
          completed: items.filter(i => i.status === "completed").length,
          processing: items.filter(i => i.status === "processing").length,
          pending: items.filter(i => i.status === "pending").length,
        },
      });
    } catch (error) {
      handleRouteError(res, error, "/api/claims-pipeline/batch/:batchId", "fetch batch");
    }
  });

  // GET /api/claims-pipeline/item/:itemId/events - Get pipeline events for an item
  app.get("/api/claims-pipeline/item/:itemId/events", async (req, res) => {
    try {
      const { itemId } = req.params;
      
      const events = await db.select()
        .from(claimPipelineEvents)
        .where(eqOp(claimPipelineEvents.itemId, itemId))
        .orderBy(claimPipelineEvents.createdAt);
      
      res.json(events);
    } catch (error) {
      handleRouteError(res, error, "/api/claims-pipeline/item/:itemId/events", "fetch events");
    }
  });

  // GET /api/claims-pipeline/batches - List all batches
  app.get("/api/claims-pipeline/batches", async (req, res) => {
    try {
      const batches = await db.select()
        .from(claimIngestBatches)
        .orderBy(descOp(claimIngestBatches.createdAt))
        .limit(50);
      
      res.json(batches);
    } catch (error) {
      handleRouteError(res, error, "/api/claims-pipeline/batches", "fetch batches");
    }
  });

  // GET /api/claims-pipeline/sample-presets - Get sample claim presets
  app.get("/api/claims-pipeline/sample-presets", async (req, res) => {
    try {
      const presets = {
        approved: {
          name: "Normal Approval",
          description: "Standard low-risk claim that passes all checks",
          claim: {
            patientId: "PAT-1002",
            providerId: "PRV-002",
            procedureCode: "99213",
            diagnosisCode: "J06.9",
            amount: 2500,
            description: "Office visit - established patient, level 3",
          },
        },
        fwa_flagged: {
          name: "FWA Flagged",
          description: "High-value claim with suspicious procedure codes",
          claim: {
            patientId: "PAT-1001",
            providerId: "PRV-001",
            procedureCode: "99215",
            diagnosisCode: "M54.5",
            amount: 35000,
            description: "Extended office visit with multiple procedures",
          },
        },
        preauth_required: {
          name: "Pre-Authorization Required",
          description: "Surgical procedure requiring prior authorization",
          claim: {
            patientId: "PAT-1003",
            providerId: "PRV-003",
            procedureCode: "27447",
            diagnosisCode: "M17.11",
            amount: 45000,
            description: "Total knee replacement surgery",
          },
        },
        escalated: {
          name: "Escalated to SIU",
          description: "High-risk provider with known fraud patterns",
          claim: {
            patientId: "PAT-1004",
            providerId: "PRV-001",
            procedureCode: "99285",
            diagnosisCode: "Z76.5",
            amount: 8500,
            description: "Emergency department visit - malingerer diagnosis",
          },
        },
      };
      
      res.json(presets);
    } catch (error) {
      handleRouteError(res, error, "/api/claims-pipeline/sample-presets", "fetch presets");
    }
  });

  // POST /api/claims/run-detection - Run imported claims through 5-method detection pipeline
  app.post("/api/claims/run-detection", async (req, res) => {
    try {
      const { limit = 20, claimIds, skipRagLlm = true } = req.body;
      const { inArray, sql, eq } = await import("drizzle-orm");
      const { claims } = await import("@shared/schema");
      
      // Get claims from the claims table
      let claimsToProcess;
      if (claimIds && Array.isArray(claimIds) && claimIds.length > 0) {
        claimsToProcess = await db.select().from(claims)
          .where(inArray(claims.id, claimIds))
          .limit(Math.min(claimIds.length, 100));
      } else {
        claimsToProcess = await db.select().from(claims)
          .orderBy(sql`RANDOM()`)
          .limit(Math.min(limit, 100));
      }
      
      if (claimsToProcess.length === 0) {
        return res.status(404).json({ error: "No claims found to process" });
      }
      
      const { runProductionDetection } = await import("../services/production-detection-engine");
      const { fwaDetectionResults, fwaDetectionRuns } = await import("@shared/schema");
      
      // Create detection run record
      const [run] = await db.insert(fwaDetectionRuns).values({
        runName: `Imported Claims Analysis ${new Date().toISOString()}`,
        runType: "imported_claims",
        status: "running",
        startedAt: new Date()
      }).returning();
      
      const results: any[] = [];
      let flagged = 0;
      let highRisk = 0;
      let critical = 0;
      const startTime = Date.now();
      
      for (const claim of claimsToProcess) {
        try {
          // Map claims table format to AnalyzedClaimData format with enhanced FWA fields
          const analyzedClaim = {
            id: claim.id,
            claimReference: claim.claimNumber || claim.id,
            providerId: claim.providerId || "UNKNOWN",
            patientId: claim.patientId || "UNKNOWN",
            practitionerLicense: claim.practitionerId,
            specialtyCode: claim.specialtyCode,
            city: claim.providerCity,
            providerType: claim.providerType,
            providerRegion: (claim as any).providerRegion,
            unitPrice: claim.unitPrice ? parseFloat(claim.unitPrice) : null,
            totalAmount: claim.amount ? parseFloat(claim.amount) : null,
            quantity: claim.rQuantity,
            principalDiagnosisCode: claim.icd,
            serviceCode: claim.serviceCode,
            serviceDescription: claim.serviceDescription || claim.description,
            claimType: claim.claimType,
            lengthOfStay: claim.lengthOfStay,
            originalStatus: claim.status,
            // Enhanced FWA fields
            isPreAuthorized: claim.isPreAuthorized || claim.preAuthorizationStatus === "approved" || claim.preAuthorizationStatus === "Approved",
            isPreAuthorizationRequired: claim.isPreAuthorizationRequired,
            preAuthorizationStatus: claim.preAuthorizationStatus,
            preAuthorizationId: claim.preAuthorizationId,
            chronicFlag: claim.chronicFlag,
            preExistingFlag: claim.preExistingFlag,
            maternityFlag: claim.maternityFlag,
            newbornFlag: claim.newbornFlag,
            policyEffectiveDate: (claim as any).policyEffectiveDate,
            serviceDate: claim.serviceDate
          };
          
          const detection = await runProductionDetection(analyzedClaim, undefined, skipRagLlm);
          
          // Save result
          await db.insert(fwaDetectionResults).values({
            claimId: detection.claimId,
            providerId: claim.providerId,
            patientId: claim.patientId,
            compositeScore: String(detection.compositeScore),
            compositeRiskLevel: detection.compositeRiskLevel as any,
            ruleEngineScore: String(detection.ruleEngineScore),
            statisticalScore: String(detection.statisticalScore),
            unsupervisedScore: String(detection.unsupervisedScore),
            ragLlmScore: String(detection.ragLlmScore),
            ruleEngineFindings: detection.ruleEngineFindings as any,
            statisticalFindings: detection.statisticalFindings as any,
            unsupervisedFindings: detection.unsupervisedFindings as any,
            ragLlmFindings: detection.ragLlmFindings as any,
            primaryDetectionMethod: detection.primaryDetectionMethod as any,
            detectionSummary: detection.detectionSummary,
            recommendedAction: detection.recommendedAction,
            processingTimeMs: detection.processingTimeMs
          });
          
          results.push(detection);
          
          if (detection.compositeRiskLevel === "critical") {
            flagged++; highRisk++; critical++;
          } else if (detection.compositeRiskLevel === "high") {
            flagged++; highRisk++;
          } else if (detection.compositeRiskLevel === "medium") {
            flagged++;
          }
        } catch (err) {
          console.error(`Detection failed for claim ${claim.id}:`, err);
        }
      }
      
      const totalTime = Date.now() - startTime;
      
      // Update run status
      await db.update(fwaDetectionRuns)
        .set({
          status: "completed",
          completedAt: new Date(),
          totalClaims: results.length,
          flaggedClaims: flagged,
          highRiskCount: highRisk,
          criticalRiskCount: critical
        })
        .where(eq(fwaDetectionRuns.id, run.id));
      
      res.json({
        runId: run.id,
        message: "Detection pipeline completed",
        summary: {
          processed: results.length,
          flagged,
          highRisk,
          critical,
          lowRisk: results.length - flagged,
          processingTimeMs: totalTime,
          avgTimePerClaim: Math.round(totalTime / results.length)
        },
        methods: {
          ruleEngine: { weight: "30%", description: "Pattern matching against 102 FWA rules" },
          statisticalLearning: { weight: "22%", description: "62-feature supervised scoring" },
          unsupervisedLearning: { weight: "18%", description: "Anomaly detection via clustering" },
          ragLlm: { weight: "15%", description: "AI-powered contextual analysis", skipped: skipRagLlm },
          semanticValidation: { weight: "15%", description: "ICD-10/CPT semantic matching" }
        },
        topResults: results
          .sort((a, b) => b.compositeScore - a.compositeScore)
          .slice(0, 10)
          .map(r => ({
            claimId: r.claimId,
            riskLevel: r.compositeRiskLevel,
            compositeScore: r.compositeScore,
            primaryMethod: r.primaryDetectionMethod,
            summary: r.detectionSummary,
            recommendedAction: r.recommendedAction
          }))
      });
    } catch (error) {
      handleRouteError(res, error, "/api/claims/run-detection", "run detection pipeline");
    }
  });

  // GET /api/claims/detection-results - View detection results for imported claims
  app.get("/api/claims/detection-results", async (req, res) => {
    try {
      const { fwaDetectionResults, fwaDetectionRuns } = await import("@shared/schema");
      const { sql, eq, desc } = await import("drizzle-orm");
      const { limit = 50, riskLevel } = req.query;
      
      let resultsQuery = db.select().from(fwaDetectionResults);
      
      if (riskLevel) {
        resultsQuery = resultsQuery.where(eq(fwaDetectionResults.compositeRiskLevel, riskLevel as any)) as any;
      }
      
      const results = await resultsQuery
        .orderBy(desc(fwaDetectionResults.analyzedAt))
        .limit(Math.min(parseInt(limit as string) || 50, 200));
      
      // Get run summaries
      const runs = await db.select().from(fwaDetectionRuns)
        .orderBy(desc(fwaDetectionRuns.startedAt))
        .limit(10);
      
      res.json({
        results: results.map(r => ({
          claimId: r.claimId,
          providerId: r.providerId,
          patientId: r.patientId,
          compositeScore: parseFloat(r.compositeScore || "0"),
          riskLevel: r.compositeRiskLevel,
          ruleEngineScore: parseFloat(r.ruleEngineScore || "0"),
          statisticalScore: parseFloat(r.statisticalScore || "0"),
          unsupervisedScore: parseFloat(r.unsupervisedScore || "0"),
          ragLlmScore: parseFloat(r.ragLlmScore || "0"),
          primaryMethod: r.primaryDetectionMethod,
          summary: r.detectionSummary,
          recommendedAction: r.recommendedAction,
          analyzedAt: r.analyzedAt
        })),
        recentRuns: runs.map(r => ({
          id: r.id,
          name: r.runName,
          type: r.runType,
          status: r.status,
          totalClaims: r.totalClaims,
          flaggedClaims: r.flaggedClaims,
          criticalRiskCount: r.criticalRiskCount,
          highRiskCount: r.highRiskCount,
          startedAt: r.startedAt,
          completedAt: r.completedAt
        }))
      });
    } catch (error) {
      handleRouteError(res, error, "/api/claims/detection-results", "get detection results");
    }
  });
}
