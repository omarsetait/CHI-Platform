import type { Express, Request, Response, NextFunction } from "express";
import type { IStorage } from "../storage";
import type { InsertClaimDocument, InsertWeightUpdateProposal } from "@shared/schema";
import OpenAI from "openai";
import multer from "multer";
import { documentIngestionService, DocumentCategory } from "../services/document-ingestion-service";
import { z } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const storage = multer.memoryStorage();
const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "text/plain",
      "text/html"
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

const uploadMetadataSchema = z.object({
  title: z.string().min(1, "Title is required"),
  titleAr: z.string().optional(),
  category: z.enum([
    "medical_guideline",
    "clinical_pathway",
    "policy_violation",
    "regulation",
    "circular",
    "contract",
    "procedure_manual",
    "training_material",
    "other"
  ]),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  sourceAuthority: z.string().optional(),
  effectiveDate: z.string().optional(),
  expiryDate: z.string().optional()
});

export function registerDocumentRoutes(
  app: Express,
  storage: IStorage,
  handleRouteError: (res: any, error: unknown, routePath: string, operation?: string) => void
) {
  app.get("/api/documents", async (req, res) => {
    try {
      const { claimId } = req.query;
      const documents = await storage.getClaimDocuments(claimId as string);
      res.json(documents);
    } catch (error) {
      handleRouteError(res, error, "/api/documents", "fetch documents");
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.getClaimDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      handleRouteError(res, error, "/api/documents/:id", "fetch document");
    }
  });

  app.post("/api/documents/upload", async (req, res) => {
    try {
      const { claimId, claimReference, documentType, fileName, fileSize, mimeType, ocrText } = req.body;

      if (!documentType || !fileName) {
        return res.status(400).json({ error: "documentType and fileName are required" });
      }

      if (!ocrText || ocrText.trim().length < 10) {
        return res.status(400).json({ error: "OCR text is required (minimum 10 characters)" });
      }

      if (!claimReference && !claimId) {
        return res.status(400).json({ error: "Either claimReference or claimId is required" });
      }

      const docData: InsertClaimDocument = {
        claimId: claimId || null,
        claimReference: claimReference || null,
        documentType,
        fileName,
        fileSize: fileSize || null,
        mimeType: mimeType || "text/plain",
        ocrText: ocrText.trim(),
        ocrConfidence: "0.85",
        ocrProcessedAt: new Date(),
      };

      const document = await storage.createClaimDocument(docData);
      console.log(`[Document] Uploaded: ${fileName} for claim ${claimReference || claimId}`);
      
      res.status(201).json({
        success: true,
        document,
        message: `Document "${fileName}" uploaded successfully`,
      });
    } catch (error) {
      handleRouteError(res, error, "/api/documents/upload", "upload document");
    }
  });

  app.post("/api/documents/:id/extract", async (req, res) => {
    try {
      const document = await storage.getClaimDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const ocrText = document.ocrText || req.body.ocrText;
      if (!ocrText) {
        return res.status(400).json({ error: "No OCR text available for extraction" });
      }

      const extractedDiagnoses: string[] = [];
      const extractedProcedures: string[] = [];
      const extractedDates: Array<{label: string; date: string}> = [];
      const extractedAmounts: Array<{label: string; amount: number}> = [];

      const icdPattern = /\b([A-Z]\d{2}(?:\.\d{1,2})?)\b/g;
      const icdMatches = ocrText.match(icdPattern);
      if (icdMatches) {
        extractedDiagnoses.push(...icdMatches);
      }

      const cptPattern = /\b(\d{5})\b/g;
      const cptMatches = ocrText.match(cptPattern);
      if (cptMatches) {
        extractedProcedures.push(...cptMatches.slice(0, 10));
      }

      const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g;
      const dateMatches = ocrText.match(datePattern);
      if (dateMatches) {
        dateMatches.slice(0, 5).forEach((d: string, i: number) => {
          extractedDates.push({ label: `Date ${i + 1}`, date: d });
        });
      }

      const amountPattern = /(?:SAR|SR|\$)\s*([\d,]+(?:\.\d{2})?)/gi;
      const amountMatches = [...ocrText.matchAll(amountPattern)];
      if (amountMatches.length > 0) {
        amountMatches.slice(0, 5).forEach((m, i) => {
          const amount = parseFloat(m[1].replace(/,/g, ""));
          extractedAmounts.push({ label: `Amount ${i + 1}`, amount });
        });
      }

      const updated = await storage.updateClaimDocument(req.params.id, {
        extractedDiagnoses,
        extractedProcedures,
        extractedDates,
        extractedAmounts,
      });

      res.json({
        success: true,
        extraction: {
          diagnoses: extractedDiagnoses,
          procedures: extractedProcedures,
          dates: extractedDates,
          amounts: extractedAmounts,
        },
        document: updated,
      });
    } catch (error) {
      handleRouteError(res, error, "/api/documents/:id/extract", "extract data from document");
    }
  });

  app.post("/api/documents/:id/compare", async (req, res) => {
    try {
      const document = await storage.getClaimDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const { claimData } = req.body;
      if (!claimData) {
        return res.status(400).json({ error: "claimData is required for comparison" });
      }

      const ocrText = document.ocrText || "";
      
      let aiComparisonResult;
      try {
        const prompt = `You are a healthcare fraud detection specialist. Compare the following medical document text with the claim data and identify any discrepancies that could indicate fraud, waste, or abuse.

DOCUMENT TEXT (from OCR):
${ocrText.substring(0, 3000)}

CLAIM DATA:
- Claim Reference: ${claimData.claimReference || "N/A"}
- Amount: ${claimData.amount || "N/A"} SAR
- Diagnosis Code: ${claimData.principalDiagnosisCode || "N/A"}
- Secondary Diagnoses: ${claimData.secondaryDiagnosisCodes || "N/A"}
- Description: ${claimData.description || "N/A"}
- Provider: ${claimData.providerId || "N/A"}
- Specialty: ${claimData.specialtyCode || "N/A"}
- Claim Type: ${claimData.claimType || "N/A"}

Analyze and return a JSON object with:
{
  "discrepancies": [
    { "field": "...", "claimValue": "...", "documentValue": "...", "severity": "low|medium|high|critical", "explanation": "..." }
  ],
  "matchScore": 0-100,
  "riskIndicators": ["..."],
  "recommendation": "approve|review|reject|investigate"
}

Only return valid JSON, no other text.`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 1500,
        });

        const content = response.choices[0]?.message?.content || "{}";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        aiComparisonResult = jsonMatch ? JSON.parse(jsonMatch[0]) : {
          discrepancies: [],
          matchScore: 75,
          riskIndicators: [],
          recommendation: "review"
        };
      } catch (aiError) {
        console.error("[Document] AI comparison failed:", aiError);
        aiComparisonResult = {
          discrepancies: [],
          matchScore: 70,
          riskIndicators: ["AI analysis unavailable"],
          recommendation: "review"
        };
      }

      const updated = await storage.updateClaimDocument(req.params.id, {
        aiComparisonResult,
      });

      res.json({
        success: true,
        comparison: aiComparisonResult,
        document: updated,
      });
    } catch (error) {
      handleRouteError(res, error, "/api/documents/:id/compare", "compare document with claim");
    }
  });

  app.get("/api/weight-proposals", async (req, res) => {
    try {
      const { status } = req.query;
      const proposals = await storage.getWeightUpdateProposals(status as string);
      res.json(proposals);
    } catch (error) {
      handleRouteError(res, error, "/api/weight-proposals", "fetch weight proposals");
    }
  });

  app.post("/api/weight-proposals/generate", async (req, res) => {
    try {
      const metrics = await storage.getRlhfMetrics();
      const allFeedback = await storage.getRlhfFeedback();

      const methodStats: Record<string, { total: number; accepted: number; overridden: number }> = {
        rule_engine: { total: 0, accepted: 0, overridden: 0 },
        statistical_learning: { total: 0, accepted: 0, overridden: 0 },
        unsupervised_learning: { total: 0, accepted: 0, overridden: 0 },
        rag_llm: { total: 0, accepted: 0, overridden: 0 },
      };

      allFeedback.forEach(fb => {
        const method = fb.detectionMethod || "rule_engine";
        if (methodStats[method]) {
          methodStats[method].total++;
          if (fb.wasAccepted) {
            methodStats[method].accepted++;
          } else {
            methodStats[method].overridden++;
          }
        }
      });

      const currentWeights: Record<string, number> = {
        rule_engine: 0.35,
        statistical_learning: 0.25,
        unsupervised_learning: 0.20,
        rag_llm: 0.20,
      };

      const proposals: InsertWeightUpdateProposal[] = [];
      const minFeedback = 1;

      for (const [method, stats] of Object.entries(methodStats)) {
        if (stats.total < minFeedback) continue;

        const acceptanceRate = stats.total > 0 ? (stats.accepted / stats.total) * 100 : 0;
        const overrideRate = stats.total > 0 ? (stats.overridden / stats.total) * 100 : 0;
        const currentWeight = currentWeights[method];

        let proposedWeight = currentWeight;
        let rationale = "";

        if (overrideRate > 30) {
          proposedWeight = Math.max(0.10, currentWeight - 0.05);
          rationale = `High override rate (${overrideRate.toFixed(1)}%) suggests this method produces too many false positives. Recommend reducing weight.`;
        } else if (acceptanceRate > 60 && stats.total >= 2) {
          proposedWeight = Math.min(0.50, currentWeight + 0.03);
          rationale = `High acceptance rate (${acceptanceRate.toFixed(1)}%) indicates reliable detection. Recommend increasing weight.`;
        }

        if (proposedWeight !== currentWeight) {
          proposals.push({
            detectionMethod: method,
            currentWeight: currentWeight.toFixed(3),
            proposedWeight: proposedWeight.toFixed(3),
            weightDelta: (proposedWeight - currentWeight).toFixed(3),
            feedbackCount: stats.total,
            acceptanceRate: acceptanceRate.toFixed(2),
            overrideRate: overrideRate.toFixed(2),
            rationale,
            evidence: {
              totalFeedback: stats.total,
              accepted: stats.accepted,
              overridden: stats.overridden,
              falsePositives: stats.overridden,
              falseNegatives: 0,
              avgScoreDelta: 0,
            },
            status: "pending",
          });
        }
      }

      const created = [];
      for (const proposal of proposals) {
        const result = await storage.createWeightUpdateProposal(proposal);
        created.push(result);
      }

      res.json({
        success: true,
        proposalsGenerated: created.length,
        proposals: created,
        methodStats,
      });
    } catch (error) {
      handleRouteError(res, error, "/api/weight-proposals/generate", "generate weight proposals");
    }
  });

  app.post("/api/weight-proposals/:id/apply", async (req, res) => {
    try {
      const { action, reviewNotes } = req.body;
      const proposal = await storage.getWeightUpdateProposals();
      const targetProposal = proposal.find(p => p.id === req.params.id);

      if (!targetProposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      if (action === "approve") {
        await storage.updateWeightUpdateProposal(req.params.id, {
          status: "applied",
          reviewedBy: "demo-reviewer",
          reviewedAt: new Date(),
          appliedAt: new Date(),
          reviewNotes: reviewNotes || "Approved and applied",
        });

        console.log(`[Weight] Applied weight change: ${targetProposal.detectionMethod} ${targetProposal.currentWeight} -> ${targetProposal.proposedWeight}`);

        res.json({
          success: true,
          message: `Weight updated for ${targetProposal.detectionMethod}`,
          appliedWeight: targetProposal.proposedWeight,
        });
      } else if (action === "reject") {
        await storage.updateWeightUpdateProposal(req.params.id, {
          status: "rejected",
          reviewedBy: "demo-reviewer",
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || "Rejected",
        });

        res.json({
          success: true,
          message: "Proposal rejected",
        });
      } else {
        res.status(400).json({ error: "Invalid action. Use 'approve' or 'reject'" });
      }
    } catch (error) {
      handleRouteError(res, error, "/api/weight-proposals/:id/apply", "apply weight proposal");
    }
  });

  // =============================================
  // Knowledge Document Upload & Vector Storage API
  // =============================================

  // Upload a single knowledge document (PDF, Word, Image)
  app.post("/api/knowledge-documents/upload", uploadMiddleware.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file provided",
          errorAr: "لم يتم تقديم ملف"
        });
      }

      const metadataValidation = uploadMetadataSchema.safeParse(req.body);
      if (!metadataValidation.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid metadata",
          errorAr: "بيانات وصفية غير صالحة",
          details: metadataValidation.error.errors
        });
      }

      const metadata = metadataValidation.data;

      const result = await documentIngestionService.uploadDocument({
        file: req.file,
        title: metadata.title,
        titleAr: metadata.titleAr,
        category: metadata.category as DocumentCategory,
        description: metadata.description,
        descriptionAr: metadata.descriptionAr,
        sourceAuthority: metadata.sourceAuthority,
        effectiveDate: metadata.effectiveDate ? new Date(metadata.effectiveDate) : undefined,
        expiryDate: metadata.expiryDate ? new Date(metadata.expiryDate) : undefined,
        uploadedBy: (req as any).user?.id
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      handleRouteError(res, error, "/api/knowledge-documents/upload", "upload knowledge document");
    }
  });

  // Upload multiple knowledge documents
  app.post("/api/knowledge-documents/upload-batch", uploadMiddleware.array("files", 10), async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No files provided",
          errorAr: "لم يتم تقديم ملفات"
        });
      }

      const metadataList = JSON.parse(req.body.metadata || "[]");
      const results = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const metadata = metadataList[i] || {
          title: file.originalname,
          category: "other"
        };

        const result = await documentIngestionService.uploadDocument({
          file,
          title: metadata.title || file.originalname,
          titleAr: metadata.titleAr,
          category: metadata.category || "other",
          description: metadata.description,
          descriptionAr: metadata.descriptionAr,
          sourceAuthority: metadata.sourceAuthority,
          uploadedBy: (req as any).user?.id
        });

        results.push(result);
      }

      res.status(201).json({
        success: true,
        data: {
          uploaded: results.length,
          documents: results
        }
      });
    } catch (error) {
      handleRouteError(res, error, "/api/knowledge-documents/upload-batch", "batch upload knowledge documents");
    }
  });

  // Semantic search across knowledge documents
  app.post("/api/knowledge-documents/search", async (req: Request, res: Response) => {
    try {
      const { query, limit = 10, category } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(400).json({
          success: false,
          error: "Query is required",
          errorAr: "الاستعلام مطلوب"
        });
      }

      const results = await documentIngestionService.semanticSearch(
        query,
        Math.min(limit, 50),
        category
      );

      res.json({
        success: true,
        data: {
          query,
          resultCount: results.length,
          results
        }
      });
    } catch (error) {
      handleRouteError(res, error, "/api/knowledge-documents/search", "semantic search");
    }
  });

  // Get all knowledge documents with pagination
  app.get("/api/knowledge-documents", async (req: Request, res: Response) => {
    try {
      const { category, status, limit = 50, offset = 0 } = req.query;

      const { documents, total } = await documentIngestionService.getDocuments({
        category: category as DocumentCategory,
        status: status as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({
        success: true,
        data: {
          documents,
          pagination: {
            total,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: parseInt(offset as string) + documents.length < total
          }
        }
      });
    } catch (error) {
      handleRouteError(res, error, "/api/knowledge-documents", "list knowledge documents");
    }
  });

  // Get knowledge document processing stats
  app.get("/api/knowledge-documents/stats", async (req: Request, res: Response) => {
    try {
      const stats = await documentIngestionService.getProcessingStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      handleRouteError(res, error, "/api/knowledge-documents/stats", "get document stats");
    }
  });

  // Get a specific knowledge document
  app.get("/api/knowledge-documents/:id", async (req: Request, res: Response) => {
    try {
      const document = await documentIngestionService.getDocumentById(req.params.id);
      if (!document) {
        return res.status(404).json({
          success: false,
          error: "Document not found",
          errorAr: "المستند غير موجود"
        });
      }
      res.json({
        success: true,
        data: document
      });
    } catch (error) {
      handleRouteError(res, error, "/api/knowledge-documents/:id", "get knowledge document");
    }
  });

  // Delete a knowledge document
  app.delete("/api/knowledge-documents/:id", async (req: Request, res: Response) => {
    try {
      await documentIngestionService.deleteDocument(req.params.id);
      res.json({
        success: true,
        message: "Document deleted successfully",
        messageAr: "تم حذف المستند بنجاح"
      });
    } catch (error) {
      handleRouteError(res, error, "/api/knowledge-documents/:id", "delete knowledge document");
    }
  });
}
