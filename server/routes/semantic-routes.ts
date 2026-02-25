import { Express } from "express";
import { z } from "zod";
import {
  getSemanticMatch,
  findSimilarCptCodes,
  findSimilarIcd10Codes,
  importCptCodes,
  importIcd10Codes,
  getImportJobStatus,
  getEmbeddingStats
} from "../services/semantic-embedding-service";

const matchQuerySchema = z.object({
  icd: z.string().min(1),
  cpt: z.string().min(1)
});

const similarQuerySchema = z.object({
  code: z.string().min(1),
  limit: z.string().optional().transform(v => v ? parseInt(v) : 5)
});

const importSchema = z.object({
  filePath: z.string().optional()
});

export function registerSemanticRoutes(
  app: Express,
  handleRouteError: (res: any, error: unknown, routePath: string, operation?: string) => void
) {
  app.get("/api/semantic/icd-cpt-match", async (req, res) => {
    try {
      const { icd, cpt } = matchQuerySchema.parse(req.query);
      
      const result = await getSemanticMatch(icd, cpt);
      
      if (!result) {
        return res.status(404).json({
          error: "Codes not found",
          message: `Could not find embeddings for ICD-10 code '${icd}' or CPT code '${cpt}'. Ensure codes are imported and embeddings are generated.`
        });
      }
      
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/semantic/icd-cpt-match", "compute semantic match");
    }
  });

  app.get("/api/semantic/similar-cpt", async (req, res) => {
    try {
      const { code, limit } = similarQuerySchema.parse(req.query);
      
      const results = await findSimilarCptCodes(code, limit);
      
      res.json({
        icdCode: code,
        similarCptCodes: results,
        count: results.length
      });
    } catch (error) {
      handleRouteError(res, error, "/api/semantic/similar-cpt", "find similar CPT codes");
    }
  });

  app.get("/api/semantic/similar-icd", async (req, res) => {
    try {
      const { code, limit } = similarQuerySchema.parse(req.query);
      
      const results = await findSimilarIcd10Codes(code, limit);
      
      res.json({
        cptCode: code,
        similarIcdCodes: results,
        count: results.length
      });
    } catch (error) {
      handleRouteError(res, error, "/api/semantic/similar-icd", "find similar ICD-10 codes");
    }
  });

  app.post("/api/semantic/import/cpt", async (req, res) => {
    try {
      const parsed = importSchema.parse(req.body || {});
      const filePath = parsed.filePath || "attached_assets/cpt_explainers_optionB_FULL_v3_(1)_1768666439700.csv";
      
      const result = await importCptCodes(filePath);
      
      res.json({
        message: "CPT import started",
        jobId: result.jobId,
        statusUrl: `/api/semantic/import/status/${result.jobId}`
      });
    } catch (error) {
      handleRouteError(res, error, "/api/semantic/import/cpt", "start CPT import");
    }
  });

  app.post("/api/semantic/import/icd10", async (req, res) => {
    try {
      const parsed = importSchema.parse(req.body || {});
      const filePath = parsed.filePath || "attached_assets/icd10cm_tabular_2025_master_(1)_(1)_1768666439701.xlsx";
      
      const result = await importIcd10Codes(filePath);
      
      res.json({
        message: "ICD-10 import started",
        jobId: result.jobId,
        statusUrl: `/api/semantic/import/status/${result.jobId}`
      });
    } catch (error) {
      handleRouteError(res, error, "/api/semantic/import/icd10", "start ICD-10 import");
    }
  });

  app.get("/api/semantic/import/status/:jobId", async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      
      if (isNaN(jobId)) {
        return res.status(400).json({ error: "Invalid job ID" });
      }
      
      const job = await getImportJobStatus(jobId);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      const progress = job.totalRecords > 0 
        ? Math.round((job.processedRecords / job.totalRecords) * 100)
        : 0;
      
      res.json({
        ...job,
        progress,
        isComplete: job.status === 'completed' || job.status === 'failed'
      });
    } catch (error) {
      handleRouteError(res, error, "/api/semantic/import/status", "get import status");
    }
  });

  app.get("/api/semantic/stats", async (req, res) => {
    try {
      const stats = await getEmbeddingStats();
      
      const cptCoverage = stats.cptCount > 0 
        ? (stats.cptWithEmbeddings / stats.cptCount) * 100
        : 0;
      const icd10Coverage = stats.icd10Count > 0 
        ? (stats.icd10WithEmbeddings / stats.icd10Count) * 100
        : 0;
      
      res.json({
        cpt: {
          totalRecords: stats.cptCount,
          withEmbeddings: stats.cptWithEmbeddings,
          withoutEmbeddings: stats.cptCount - stats.cptWithEmbeddings,
          embeddingCoverage: cptCoverage
        },
        icd10: {
          totalRecords: stats.icd10Count,
          withEmbeddings: stats.icd10WithEmbeddings,
          withoutEmbeddings: stats.icd10Count - stats.icd10WithEmbeddings,
          embeddingCoverage: icd10Coverage
        },
        summary: {
          cptEmbeddingProgress: Math.round(cptCoverage),
          icd10EmbeddingProgress: Math.round(icd10Coverage),
          isReady: stats.cptWithEmbeddings > 0 && stats.icd10WithEmbeddings > 0
        }
      });
    } catch (error) {
      handleRouteError(res, error, "/api/semantic/stats", "get embedding stats");
    }
  });

  app.post("/api/semantic/validate-claim", async (req, res) => {
    try {
      const { icdCode, cptCode, claimId } = req.body;
      
      if (!icdCode || !cptCode) {
        return res.status(400).json({
          error: "Missing required fields",
          message: "Both icdCode and cptCode are required"
        });
      }
      
      const match = await getSemanticMatch(icdCode, cptCode);
      
      if (!match) {
        return res.json({
          claimId,
          icdCode,
          cptCode,
          isValid: null,
          message: "Unable to validate - codes not found in embedding database",
          recommendation: "Import embeddings for ICD-10 and CPT codes first"
        });
      }
      
      res.json({
        claimId,
        icdCode,
        cptCode,
        isValid: match.riskLevel === 'low' || match.riskLevel === 'medium',
        riskLevel: match.riskLevel,
        confidencePercent: match.confidencePercent,
        clinicalInterpretation: match.clinicalInterpretation,
        icdDescription: match.icdDescription,
        cptDescription: match.cptDescription,
        recommendation: match.riskLevel === 'critical' 
          ? 'Flag for manual review - procedure-diagnosis mismatch'
          : match.riskLevel === 'high'
          ? 'Review recommended - unusual pairing'
          : 'Proceed with normal processing'
      });
    } catch (error) {
      handleRouteError(res, error, "/api/semantic/validate-claim", "validate claim");
    }
  });

  console.log("[Semantic] Routes registered successfully");
}
