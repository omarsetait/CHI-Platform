import type { Express } from "express";
import type { IStorage } from "../storage";
import { z } from "zod";
import { demoProviders, demoProviderContracts } from "../services/demo-data-seeder";
import { DreamReportService } from "../services/dream-report-service";
import { demoClaimsSeeder } from "../services/demo-claims-seeder";
import { 
  insertProviderCommunicationSchema, 
  insertProviderDirectorySchema,
  insertProviderBenchmarkSchema,
  insertProviderCpmMetricSchema,
  insertKpiDefinitionSchema,
  insertKpiResultSchema,
  type ProviderBenchmark,
  type ProviderCpmMetric,
  type KpiDefinition,
  type InsertKpiDefinition,
  type KpiResult,
  type InsertKpiResult
} from "@shared/schema";
import multer from "multer";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

const upload = multer({
  dest: "/tmp/uploads",
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/json"
    ];
    const allowedExts = [".xlsx", ".xls", ".csv", ".json"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Allowed: XLSX, CSV, JSON"));
    }
  }
});


interface PeerGroup {
  id: string;
  groupId: string;
  name: string;
  criteria: {
    region?: string;
    providerType?: string;
    specialty?: string;
    tier?: string;
  };
  memberCount: number;
  avgCpm: string;
  avgDenialRate: string;
  avgClaimVolume: number;
}

interface ProviderBenchmarkResponse {
  providerId: string;
  providerName: string;
  peerGroupId: string;
  peerGroupName: string;
  metrics: {
    cpm: { value: string; peerAvg: string; percentile: number; trend: string };
    denialRate: { value: string; peerAvg: string; percentile: number; trend: string };
    claimVolume: { value: number; peerAvg: number; percentile: number; trend: string };
    avgClaimAmount: { value: string; peerAvg: string; percentile: number; trend: string };
    processingTime: { value: string; peerAvg: string; percentile: number; trend: string };
  };
  ranking: { position: number; total: number; change: number };
  trends: Array<{ month: string; cpm: string; peerCpm: string }>;
}


function cleanupFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore cleanup errors
  }
}

function getSchemaFields(targetModule: string): { required: string[]; optional: string[] } {
  switch (targetModule) {
    case "providers":
      return {
        required: ["npi", "name", "specialty"],
        optional: ["organization", "email", "phone", "address", "city", "region", "contractStatus", "networkTier", "licenseNumber", "licenseExpiry", "memberCount", "riskScore"]
      };
    case "findings":
      return {
        required: ["providerId", "providerName", "findingType", "category", "potentialAmount", "description"],
        optional: ["subCategory", "status", "claimCount", "claimIds", "evidencePackId", "confidence", "dataCompleteness", "ruleStrength", "attachmentAvailability", "weaknessFlags", "periodStart", "periodEnd", "detectedBy", "validatedBy", "validatedAt"]
      };
    case "claims":
      return {
        required: ["claimNumber", "policyNumber", "claimType", "hospital", "amount"],
        optional: ["registrationDate", "outlierScore", "description", "icd", "hasSurgery", "surgeryFee", "hasIcu", "lengthOfStay", "similarClaims", "similarClaimsInHospital"]
      };
    case "benchmarks":
      return {
        required: ["providerId", "providerName", "periodStart", "periodEnd"],
        optional: ["peerGroupId", "totalClaims", "totalBilledAmount", "totalPaidAmount", "memberCount", "costPerMember", "claimsPerMember", "avgClaimAmount", "peerPercentile", "deviationFromPeer", "standardDeviations", "anomalyScore", "anomalyFlags", "serviceBreakdown"]
      };
    default:
      return { required: [], optional: [] };
  }
}

async function insertRow(storage: any, targetModule: string, data: Record<string, any>): Promise<void> {
  switch (targetModule) {
    case "providers":
      const existingProvider = await storage.getProviderDirectoryByNpi(data.npi);
      if (existingProvider) {
        throw new Error(`Provider with NPI ${data.npi} already exists`);
      }
      await storage.createProviderDirectoryEntry({
        npi: String(data.npi || "").padStart(10, "0"),
        name: data.name,
        specialty: data.specialty,
        organization: data.organization || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        region: data.region || null,
        contractStatus: data.contractStatus || "Pending",
        networkTier: data.networkTier || "Tier 2",
        licenseNumber: data.licenseNumber || null,
        licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : null,
        memberCount: data.memberCount ? parseInt(data.memberCount) : 0,
        riskScore: data.riskScore || null
      });
      break;
      
    case "findings":
      await storage.createOperationalFinding({
        providerId: data.providerId,
        providerName: data.providerName,
        findingType: data.findingType,
        category: data.category,
        subCategory: data.subCategory || null,
        status: data.status || "detected",
        potentialAmount: String(data.potentialAmount),
        claimCount: data.claimCount ? parseInt(data.claimCount) : 0,
        claimIds: Array.isArray(data.claimIds) ? data.claimIds : (data.claimIds ? [data.claimIds] : []),
        description: data.description,
        evidencePackId: data.evidencePackId || null,
        confidence: data.confidence || null,
        dataCompleteness: data.dataCompleteness || null,
        ruleStrength: data.ruleStrength || null,
        attachmentAvailability: data.attachmentAvailability === true || data.attachmentAvailability === "true",
        weaknessFlags: Array.isArray(data.weaknessFlags) ? data.weaknessFlags : [],
        periodStart: data.periodStart ? new Date(data.periodStart) : null,
        periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
        detectedBy: data.detectedBy || "import"
      });
      break;
      
    case "benchmarks":
      await storage.createProviderBenchmark({
        providerId: data.providerId,
        providerName: data.providerName,
        peerGroupId: data.peerGroupId || null,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        totalClaims: data.totalClaims ? parseInt(data.totalClaims) : 0,
        totalBilledAmount: data.totalBilledAmount || null,
        totalPaidAmount: data.totalPaidAmount || null,
        memberCount: data.memberCount ? parseInt(data.memberCount) : 0,
        costPerMember: data.costPerMember || null,
        claimsPerMember: data.claimsPerMember || null,
        avgClaimAmount: data.avgClaimAmount || null,
        peerPercentile: data.peerPercentile || null,
        deviationFromPeer: data.deviationFromPeer || null,
        standardDeviations: data.standardDeviations || null,
        anomalyScore: data.anomalyScore || null,
        anomalyFlags: data.anomalyFlags || [],
        serviceBreakdown: data.serviceBreakdown || null
      });
      break;
      
    case "claims":
      throw new Error("Claims import not yet implemented - use the claims batch upload feature");
      
    default:
      throw new Error(`Unknown target module: ${targetModule}`);
  }
}

const demoPeerGroups: PeerGroup[] = [
  { id: "pg-001", groupId: "PG-HOSP-MULTI", name: "Multi-Specialty Hospitals - Central Region", criteria: { region: "Central", providerType: "Hospital", specialty: "Multi-Specialty" }, memberCount: 15, avgCpm: "1050.00", avgDenialRate: "12.5", avgClaimVolume: 4200 },
  { id: "pg-002", groupId: "PG-HOSP-GEN", name: "General Hospitals - All Regions", criteria: { providerType: "Hospital", specialty: "General" }, memberCount: 28, avgCpm: "875.00", avgDenialRate: "10.8", avgClaimVolume: 2800 },
  { id: "pg-003", groupId: "PG-CLINIC-PRI", name: "Primary Care Clinics", criteria: { providerType: "Clinic", specialty: "Primary Care" }, memberCount: 45, avgCpm: "425.00", avgDenialRate: "8.2", avgClaimVolume: 950 },
  { id: "pg-004", groupId: "PG-PHARM-RET", name: "Retail Pharmacies", criteria: { providerType: "Pharmacy", specialty: "Retail" }, memberCount: 120, avgCpm: "185.00", avgDenialRate: "5.5", avgClaimVolume: 2200 },
];

export function registerProviderRoutes(
  app: Express,
  storage: IStorage,
  handleRouteError: (res: any, error: unknown, routePath: string, operation?: string) => void
) {
  // Dream Reports Endpoints
  app.get("/api/provider-relations/dream-reports", async (req, res) => {
    try {
      const { status, providerId } = req.query;
      let reports = await storage.getAllDreamReports();
      
      if (status && typeof status === "string") {
        reports = reports.filter(r => r.status === status);
      }
      if (providerId && typeof providerId === "string") {
        reports = reports.filter(r => r.providerId === providerId);
      }
      
      res.json(reports);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/dream-reports", "fetch dream reports");
    }
  });

  app.get("/api/provider-relations/dream-reports/:id", async (req, res) => {
    try {
      const report = await storage.getDreamReportById(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Dream report not found" });
      }
      res.json(report);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/dream-reports/:id", "fetch dream report");
    }
  });

  app.post("/api/provider-relations/dream-reports/generate", async (req, res) => {
    try {
      const dreamReportGenerateSchema = z.object({
        providerId: z.string().min(1, "providerId is required"),
        periodStart: z.string().optional(),
        periodEnd: z.string().optional(),
      });
      
      const parseResult = dreamReportGenerateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }
      
      const { providerId, periodStart, periodEnd } = parseResult.data;
      
      // Look up provider from directory first, then fall back to demo data
      let provider = await storage.getProviderDirectoryById(providerId);
      let providerName = provider?.name;
      let providerIdToUse = providerId;
      
      if (!provider) {
        const demoProvider = demoProviders.find(p => p.providerId === providerId || p.id === providerId);
        if (!demoProvider) {
          return res.status(404).json({ error: "Provider not found" });
        }
        providerName = demoProvider.providerName;
        providerIdToUse = demoProvider.providerId;
      }
      
      const now = new Date();
      const reportNumber = `DR-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 10000)}`;
      
      // Create initial report with "generating" status
      const initialReport = await storage.createDreamReport({
        reportNumber,
        providerId: providerIdToUse,
        providerName: providerName || "Unknown Provider",
        periodStart: periodStart ? new Date(periodStart) : new Date(now.getFullYear(), now.getMonth() - 3, 1),
        periodEnd: periodEnd ? new Date(periodEnd) : now,
        status: "generating",
        executiveSummary: "Generating report with AI...",
        benchmarkAnalysis: null,
        findings: [],
        totalPotentialAmount: "0",
        recommendations: [],
        generatedBy: "ai",
        generatedAt: now
      });
      
      // Start AI generation asynchronously
      const dreamReportService = new DreamReportService();
      
      // Generate report in background and update when complete
      (async () => {
        try {
          console.log(`[DreamReport] Starting AI generation for report ${initialReport.id}`);
          
          const aiContent = await dreamReportService.generateReport(providerId, {
            periodStart: periodStart ? new Date(periodStart) : undefined,
            periodEnd: periodEnd ? new Date(periodEnd) : undefined,
          });
          
          // Update report with AI-generated content
          await storage.updateDreamReport(initialReport.id, {
            status: "completed",
            executiveSummary: aiContent.executiveSummary,
            benchmarkAnalysis: aiContent.benchmarkAnalysis,
            findings: aiContent.findings,
            totalPotentialAmount: aiContent.totalPotentialAmount,
            recommendations: aiContent.recommendations,
            categoryBreakdown: aiContent.categoryBreakdown,
            claimSamples: aiContent.claimSamples,
            aiInsights: aiContent.aiInsights,
          });
          
          console.log(`[DreamReport] AI generation completed for report ${initialReport.id}`);
        } catch (error) {
          console.error(`[DreamReport] AI generation failed for report ${initialReport.id}:`, error);
          
          // Update report with error status
          await storage.updateDreamReport(initialReport.id, {
            status: "failed",
            executiveSummary: `Report generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
        }
      })();
      
      // Return immediately with the report ID (still generating)
      res.status(201).json(initialReport);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/dream-reports/generate", "generate dream report");
    }
  });

  // Evidence Packs Endpoints
  app.get("/api/provider-relations/evidence-packs", async (req, res) => {
    try {
      const { status, providerId, sessionId } = req.query;
      let packs = await storage.getAllEvidencePacks();
      
      if (status && typeof status === "string") {
        packs = packs.filter(p => p.status === status);
      }
      if (providerId && typeof providerId === "string") {
        packs = packs.filter(p => p.providerId === providerId);
      }
      if (sessionId && typeof sessionId === "string") {
        packs = packs.filter(p => p.sessionId === sessionId);
      }
      
      res.json(packs);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/evidence-packs", "fetch evidence packs");
    }
  });

  app.get("/api/provider-relations/evidence-packs/:id", async (req, res) => {
    try {
      const pack = await storage.getEvidencePackById(req.params.id);
      if (!pack) {
        return res.status(404).json({ error: "Evidence pack not found" });
      }
      res.json(pack);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/evidence-packs/:id", "fetch evidence pack");
    }
  });

  app.post("/api/provider-relations/evidence-packs", async (req, res) => {
    try {
      const evidencePackCreateSchema = z.object({
        providerId: z.string().min(1, "providerId is required"),
        sessionId: z.string().optional(),
        title: z.string().min(1, "title is required"),
        description: z.string().optional(),
      });
      
      const parseResult = evidencePackCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }
      
      const { providerId, sessionId, title, description } = parseResult.data;
      
      // Look up provider from directory first, then fall back to demo data
      let providerName = "Unknown Provider";
      const directoryProvider = await storage.getProviderDirectoryById(providerId);
      if (directoryProvider) {
        providerName = directoryProvider.name;
      } else {
        const demoProvider = demoProviders.find(p => p.providerId === providerId || p.id === providerId);
        if (demoProvider) {
          providerName = demoProvider.providerName;
        }
      }
      
      const now = new Date();
      const packNumber = `EP-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 10000)}`;
      
      const newPack = await storage.createEvidencePack({
        packNumber,
        providerId,
        providerName,
        title,
        description: description || null,
        status: "draft",
        sessionId: sessionId || null,
        targetAmount: "0",
        findingIds: [],
        claimIds: [],
        totalClaimCount: 0,
        categories: [],
        attachments: [],
        preparedBy: "system"
      });
      
      res.status(201).json(newPack);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/evidence-packs", "create evidence pack");
    }
  });

  app.patch("/api/provider-relations/evidence-packs/:id/lock", async (req, res) => {
    try {
      const evidencePackLockSchema = z.object({
        lockedBy: z.string().optional(),
      });
      
      const parseResult = evidencePackLockSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }
      
      const { lockedBy } = parseResult.data;
      const pack = await storage.lockEvidencePack(req.params.id, lockedBy || "system");
      if (!pack) {
        const existingPack = await storage.getEvidencePackById(req.params.id);
        if (!existingPack) {
          return res.status(404).json({ error: "Evidence pack not found" });
        }
        return res.status(400).json({ error: "Only draft packs can be locked" });
      }
      
      res.json(pack);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/evidence-packs/:id/lock", "lock evidence pack");
    }
  });

  app.patch("/api/provider-relations/evidence-packs/:id/present", async (req, res) => {
    try {
      const pack = await storage.getEvidencePackById(req.params.id);
      if (!pack) {
        return res.status(404).json({ error: "Evidence pack not found" });
      }
      
      if (pack.status !== "locked") {
        return res.status(400).json({ error: "Only locked packs can be presented" });
      }
      
      const updatedPack = await storage.updateEvidencePack(req.params.id, {
        status: "presented",
        presentedAt: new Date()
      });
      
      res.json(updatedPack);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/evidence-packs/:id/present", "mark evidence pack as presented");
    }
  });

  // Reconciliation Sessions Endpoints
  app.get("/api/provider-relations/sessions", async (req, res) => {
    try {
      const { status, providerId, meetingType } = req.query;
      let sessions = await storage.getAllReconciliationSessions();
      
      if (status && typeof status === "string") {
        sessions = sessions.filter(s => s.status === status);
      }
      if (providerId && typeof providerId === "string") {
        sessions = sessions.filter(s => s.providerId === providerId);
      }
      if (meetingType && typeof meetingType === "string") {
        sessions = sessions.filter(s => s.meetingType === meetingType);
      }
      
      res.json(sessions);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/sessions", "fetch sessions");
    }
  });

  app.get("/api/provider-relations/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getReconciliationSessionById(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/sessions/:id", "fetch session");
    }
  });

  app.post("/api/provider-relations/sessions", async (req, res) => {
    try {
      const sessionCreateSchema = z.object({
        providerId: z.string().min(1, "providerId is required"),
        meetingType: z.string().optional(),
        scheduledDate: z.string().min(1, "scheduledDate is required"),
        attendees: z.array(z.any()).optional(),
        agenda: z.array(z.any()).optional(),
        location: z.string().optional(),
      });
      
      const parseResult = sessionCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }
      
      const { providerId, meetingType, scheduledDate, attendees, agenda, location } = parseResult.data;
      
      // Look up provider from directory first, then fall back to demo data
      let providerName = "Unknown Provider";
      const directoryProvider = await storage.getProviderDirectoryById(providerId);
      if (directoryProvider) {
        providerName = directoryProvider.name;
      } else {
        const demoProvider = demoProviders.find(p => p.providerId === providerId || p.id === providerId);
        if (demoProvider) {
          providerName = demoProvider.providerName;
        }
      }
      
      const now = new Date();
      const sessionNumber = `RS-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 10000)}`;
      
      const newSession = await storage.createReconciliationSession({
        sessionNumber,
        providerId,
        providerName,
        status: "scheduled",
        scheduledDate: new Date(scheduledDate),
        location: location || null,
        meetingType: meetingType || "in_person",
        attendees: attendees || [],
        agenda: agenda || [],
        evidencePackIds: [],
        createdBy: "system"
      });
      
      res.status(201).json(newSession);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/sessions", "create session");
    }
  });

  app.patch("/api/provider-relations/sessions/:id/status", async (req, res) => {
    try {
      const sessionStatusUpdateSchema = z.object({
        status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
        minutes: z.string().optional(),
      });
      
      const parseResult = sessionStatusUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }
      
      const { status, minutes } = parseResult.data;
      
      const session = await storage.getReconciliationSessionById(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const updateData: any = {};
      if (status) updateData.status = status;
      if (minutes !== undefined) updateData.minutes = minutes;
      if (status === "completed") updateData.endTime = new Date().toISOString();
      if (status === "in_progress") updateData.startTime = new Date().toISOString();
      
      const updatedSession = await storage.updateReconciliationSession(req.params.id, updateData);
      res.json(updatedSession);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/sessions/:id/status", "update session status");
    }
  });

  app.patch("/api/provider-relations/sessions/:id/complete", async (req, res) => {
    try {
      const session = await storage.getReconciliationSessionById(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const updatedSession = await storage.updateReconciliationSession(req.params.id, {
        status: "completed",
        endTime: new Date().toISOString(),
      });
      res.json(updatedSession);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/sessions/:id/complete", "complete session");
    }
  });

  // Settlements Endpoints
  app.get("/api/provider-relations/settlements", async (req, res) => {
    try {
      const { status, providerId } = req.query;
      let settlements = await storage.getAllSettlements();
      
      if (status && typeof status === "string") {
        settlements = settlements.filter(s => s.status === status);
      }
      if (providerId && typeof providerId === "string") {
        settlements = settlements.filter(s => s.providerId === providerId);
      }
      
      res.json(settlements);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/settlements", "fetch settlements");
    }
  });

  app.get("/api/provider-relations/settlements/:id", async (req, res) => {
    try {
      const settlement = await storage.getSettlementById(req.params.id);
      if (!settlement) {
        return res.status(404).json({ error: "Settlement not found" });
      }
      res.json(settlement);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/settlements/:id", "fetch settlement");
    }
  });

  app.post("/api/provider-relations/settlements", async (req, res) => {
    try {
      const settlementCreateSchema = z.object({
        providerId: z.string().min(1, "Provider ID is required"),
        providerName: z.string().min(1, "Provider name is required"),
        periodStart: z.string().optional(),
        periodEnd: z.string().optional(),
        proposedAmount: z.string().optional(),
        evidencePackIds: z.array(z.string()).optional(),
        sessionId: z.string().optional(),
        notes: z.string().optional(),
      });

      const parseResult = settlementCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const data = parseResult.data;
      const now = new Date();
      const settlementNumber = `SETT-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      const newSettlement = await storage.createSettlement({
        settlementNumber,
        providerId: data.providerId,
        providerName: data.providerName,
        status: "proposed",
        periodStart: data.periodStart ? new Date(data.periodStart) : new Date(),
        periodEnd: data.periodEnd ? new Date(data.periodEnd) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        proposedAmount: data.proposedAmount || "0",
        evidencePackIds: data.evidencePackIds || [],
        sessionId: data.sessionId || null,
        notes: data.notes || null,
      });

      res.status(201).json(newSettlement);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/settlements", "create settlement");
    }
  });

  app.patch("/api/provider-relations/settlements/:id/status", async (req, res) => {
    try {
      const settlementStatusUpdateSchema = z.object({
        status: z.enum(["proposed", "provider_review", "negotiating", "agreed", "disputed", "finalized", "void"]).optional(),
        agreedAmount: z.string().optional(),
        notes: z.string().optional(),
      });
      
      const parseResult = settlementStatusUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }
      
      const { status, agreedAmount, notes } = parseResult.data;
      
      const settlement = await storage.getSettlementById(req.params.id);
      if (!settlement) {
        return res.status(404).json({ error: "Settlement not found" });
      }
      
      const updateData: any = {};
      if (status) updateData.status = status;
      if (agreedAmount !== undefined) updateData.agreedAmount = agreedAmount;
      if (notes !== undefined) updateData.notes = notes;
      if (status === "finalized") updateData.settlementDate = new Date();
      
      const updatedSettlement = await storage.updateSettlement(req.params.id, updateData);
      res.json(updatedSettlement);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/settlements/:id/status", "update settlement status");
    }
  });

  // Operational Findings Endpoints
  app.get("/api/provider-relations/operational-findings", async (req, res) => {
    try {
      const { status, providerId, category } = req.query;
      let findings = await storage.getAllOperationalFindings();
      
      if (status && typeof status === "string") {
        findings = findings.filter(f => f.status === status);
      }
      if (providerId && typeof providerId === "string") {
        findings = findings.filter(f => f.providerId === providerId);
      }
      if (category && typeof category === "string") {
        findings = findings.filter(f => f.category === category);
      }
      
      res.json(findings);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/operational-findings", "fetch operational findings");
    }
  });

  app.get("/api/provider-relations/operational-findings/:id", async (req, res) => {
    try {
      const finding = await storage.getOperationalFindingById(req.params.id);
      if (!finding) {
        return res.status(404).json({ error: "Operational finding not found" });
      }
      res.json(finding);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/operational-findings/:id", "fetch operational finding");
    }
  });

  app.patch("/api/provider-relations/operational-findings/:id", async (req, res) => {
    try {
      const updateSchema = z.object({
        status: z.enum(["detected", "under_review", "validated", "disputed", "resolved", "dismissed"]).optional(),
        validatedBy: z.string().optional(),
      });
      
      const parseResult = updateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }
      
      const updateData: any = { ...parseResult.data };
      if (parseResult.data.status === "validated" && parseResult.data.validatedBy) {
        updateData.validatedAt = new Date();
      }
      
      const updated = await storage.updateOperationalFinding(req.params.id, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Operational finding not found" });
      }
      res.json(updated);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/operational-findings/:id", "update operational finding");
    }
  });

  // Peer Groups Endpoints
  app.get("/api/provider-relations/peer-groups", async (req, res) => {
    try {
      const { providerType, region } = req.query;
      let groups = await storage.getAllPeerGroups();
      
      if (providerType && typeof providerType === "string") {
        groups = groups.filter(g => g.providerType === providerType);
      }
      if (region && typeof region === "string") {
        groups = groups.filter(g => g.region === region);
      }
      
      res.json(groups);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/peer-groups", "fetch peer groups");
    }
  });

  app.get("/api/provider-relations/peer-groups/:id", async (req, res) => {
    try {
      const group = await storage.getPeerGroupById(req.params.id);
      if (!group) {
        return res.status(404).json({ error: "Peer group not found" });
      }
      res.json(group);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/peer-groups/:id", "fetch peer group");
    }
  });

  app.post("/api/provider-relations/peer-groups", async (req, res) => {
    try {
      const peerGroupCreateSchema = z.object({
        groupName: z.string().min(1, "groupName is required"),
        region: z.string().min(1, "region is required"),
        city: z.string().optional(),
        providerType: z.string().min(1, "providerType is required"),
        networkTier: z.string().min(1, "networkTier is required"),
        serviceTypes: z.array(z.string()).optional(),
      });
      
      const parseResult = peerGroupCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }
      
      const { groupName, region, city, providerType, networkTier, serviceTypes } = parseResult.data;
      
      const newGroup = await storage.createPeerGroup({
        groupName,
        region,
        city: city || null,
        providerType,
        networkTier,
        serviceTypes: serviceTypes || [],
        isActive: true
      });
      
      res.status(201).json(newGroup);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/peer-groups", "create peer group");
    }
  });

  // Provider Benchmarks Endpoints
  
  // GET /api/provider-relations/benchmarks - Get all provider benchmarks
  app.get("/api/provider-relations/benchmarks", async (req, res) => {
    try {
      const benchmarks = await storage.getAllProviderBenchmarks();
      res.json(benchmarks);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/benchmarks", "fetch benchmarks");
    }
  });

  // POST /api/provider-relations/benchmarks - Create a benchmark
  app.post("/api/provider-relations/benchmarks", async (req, res) => {
    try {
      const parseResult = insertProviderBenchmarkSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: parseResult.error.flatten().fieldErrors 
        });
      }
      
      const newBenchmark = await storage.createProviderBenchmark(parseResult.data);
      res.status(201).json(newBenchmark);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/benchmarks", "create benchmark");
    }
  });

  // GET /api/provider-relations/benchmarks/:providerId - Get benchmark for specific provider
  app.get("/api/provider-relations/benchmarks/:providerId", async (req, res) => {
    try {
      // First try to fetch from database
      const dbBenchmark = await storage.getProviderBenchmarkById(req.params.providerId);
      if (dbBenchmark) {
        return res.json(dbBenchmark);
      }
      
      // Fall back to demo data only if database returns nothing
      const provider = demoProviders.find(p => p.providerId === req.params.providerId || p.id === req.params.providerId);
      if (!provider) {
        return res.status(404).json({ error: "Provider benchmark not found" });
      }
      
      const peerGroup = demoPeerGroups.find(g => g.criteria.providerType === provider.providerType) || demoPeerGroups[0];
      
      const benchmark: ProviderBenchmarkResponse = {
        providerId: provider.providerId,
        providerName: provider.providerName,
        peerGroupId: peerGroup.groupId,
        peerGroupName: peerGroup.name,
        metrics: {
          cpm: { value: provider.avgClaimAmount, peerAvg: peerGroup.avgCpm, percentile: Math.floor(Math.random() * 30) + 60, trend: provider.cpmTrend },
          denialRate: { value: provider.denialRate, peerAvg: peerGroup.avgDenialRate, percentile: Math.floor(Math.random() * 40) + 40, trend: "-2.1" },
          claimVolume: { value: provider.totalClaims, peerAvg: peerGroup.avgClaimVolume, percentile: Math.floor(Math.random() * 30) + 50, trend: "+8.5" },
          avgClaimAmount: { value: provider.avgClaimAmount, peerAvg: "5500.00", percentile: Math.floor(Math.random() * 25) + 65, trend: "+3.2" },
          processingTime: { value: "2.8", peerAvg: "3.5", percentile: 78, trend: "-0.3" }
        },
        ranking: { position: Math.floor(Math.random() * 5) + 1, total: peerGroup.memberCount, change: Math.floor(Math.random() * 5) - 2 },
        trends: [
          { month: "Jul 2025", cpm: "980", peerCpm: peerGroup.avgCpm },
          { month: "Aug 2025", cpm: "1020", peerCpm: peerGroup.avgCpm },
          { month: "Sep 2025", cpm: "1050", peerCpm: peerGroup.avgCpm },
          { month: "Oct 2025", cpm: "1080", peerCpm: peerGroup.avgCpm },
          { month: "Nov 2025", cpm: "1120", peerCpm: peerGroup.avgCpm },
          { month: "Dec 2025", cpm: provider.avgClaimAmount, peerCpm: peerGroup.avgCpm }
        ]
      };
      
      res.json(benchmark);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/benchmarks/:providerId", "fetch provider benchmarks");
    }
  });

  // CPM Analytics Endpoints
  
  // GET /api/provider-relations/cpm-analytics/summary - Get aggregated CPM stats (MUST be before :providerId route)
  app.get("/api/provider-relations/cpm-analytics/summary", async (req, res) => {
    try {
      const metrics = await storage.getAllProviderCpmMetrics();
      
      if (metrics.length === 0) {
        return res.json({
          totalProviders: 0,
          averageCpm: "0.00",
          highestCpm: null,
          lowestCpm: null,
          trendSummary: "No data available"
        });
      }
      
      const cpmValues = metrics
        .filter(m => m.cpm != null)
        .map(m => parseFloat(m.cpm as string));
      
      const avgCpm = cpmValues.length > 0 
        ? (cpmValues.reduce((sum, val) => sum + val, 0) / cpmValues.length).toFixed(2)
        : "0.00";
      
      const highestCpmMetric = metrics
        .filter(m => m.cpm != null)
        .sort((a, b) => parseFloat(b.cpm as string) - parseFloat(a.cpm as string))[0];
      
      const lowestCpmMetric = metrics
        .filter(m => m.cpm != null)
        .sort((a, b) => parseFloat(a.cpm as string) - parseFloat(b.cpm as string))[0];
      
      const uniqueProviders = new Set(metrics.map(m => m.providerId));
      
      // Calculate trend summary
      const upTrends = metrics.filter(m => m.trend && m.trend.startsWith("+")).length;
      const downTrends = metrics.filter(m => m.trend && m.trend.startsWith("-")).length;
      let trendSummary = "Stable";
      if (upTrends > downTrends * 1.5) trendSummary = "Increasing";
      else if (downTrends > upTrends * 1.5) trendSummary = "Decreasing";
      
      res.json({
        totalProviders: uniqueProviders.size,
        averageCpm: avgCpm,
        highestCpm: highestCpmMetric ? {
          providerId: highestCpmMetric.providerId,
          providerName: highestCpmMetric.providerName,
          cpm: highestCpmMetric.cpm,
          quarter: highestCpmMetric.quarter,
          year: highestCpmMetric.year
        } : null,
        lowestCpm: lowestCpmMetric ? {
          providerId: lowestCpmMetric.providerId,
          providerName: lowestCpmMetric.providerName,
          cpm: lowestCpmMetric.cpm,
          quarter: lowestCpmMetric.quarter,
          year: lowestCpmMetric.year
        } : null,
        trendSummary,
        totalMetrics: metrics.length
      });
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/cpm-analytics/summary", "fetch CPM analytics summary");
    }
  });

  // GET /api/provider-relations/cpm-analytics - Get all CPM metrics with filtering
  app.get("/api/provider-relations/cpm-analytics", async (req, res) => {
    try {
      const { providerId, year, quarter } = req.query;
      let metrics = await storage.getAllProviderCpmMetrics();
      
      if (providerId && typeof providerId === "string") {
        metrics = metrics.filter(m => m.providerId === providerId);
      }
      if (year && typeof year === "string") {
        metrics = metrics.filter(m => m.year === parseInt(year));
      }
      if (quarter && typeof quarter === "string") {
        metrics = metrics.filter(m => m.quarter === quarter);
      }
      
      res.json(metrics);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/cpm-analytics", "fetch CPM analytics");
    }
  });

  // GET /api/provider-relations/cpm-analytics/:providerId - Get CPM for specific provider
  app.get("/api/provider-relations/cpm-analytics/:providerId", async (req, res) => {
    try {
      const metrics = await storage.getProviderCpmMetricsByProviderId(req.params.providerId);
      
      if (metrics.length === 0) {
        return res.status(404).json({ error: "No CPM metrics found for this provider" });
      }
      
      // Sort by year and quarter
      const sortedMetrics = metrics.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        const quarterOrder = { "Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4 };
        return (quarterOrder[a.quarter as keyof typeof quarterOrder] || 0) - 
               (quarterOrder[b.quarter as keyof typeof quarterOrder] || 0);
      });
      
      // Calculate trend between first and last available metrics
      const cpmValues = sortedMetrics.filter(m => m.cpm != null).map(m => parseFloat(m.cpm as string));
      let overallTrend = "Stable";
      if (cpmValues.length >= 2) {
        const change = ((cpmValues[cpmValues.length - 1] - cpmValues[0]) / cpmValues[0]) * 100;
        if (change > 5) overallTrend = `+${change.toFixed(1)}%`;
        else if (change < -5) overallTrend = `${change.toFixed(1)}%`;
      }
      
      res.json({
        providerId: req.params.providerId,
        providerName: sortedMetrics[0]?.providerName || "Unknown",
        metrics: sortedMetrics,
        overallTrend,
        latestCpm: sortedMetrics[sortedMetrics.length - 1]?.cpm || null
      });
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/cpm-analytics/:providerId", "fetch provider CPM metrics");
    }
  });

  // POST /api/provider-relations/cpm-analytics - Create CPM metric
  app.post("/api/provider-relations/cpm-analytics", async (req, res) => {
    try {
      const parseResult = insertProviderCpmMetricSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: parseResult.error.flatten().fieldErrors 
        });
      }
      
      const newMetric = await storage.createProviderCpmMetric(parseResult.data);
      res.status(201).json(newMetric);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/cpm-analytics", "create CPM metric");
    }
  });

  // Provider Relations Dashboard Stats
  app.get("/api/provider-relations/stats", async (req, res) => {
    try {
      // Fetch actual database data
      const providerDirectory = await storage.getAllProviderDirectoryEntries();
      const providerContracts = await storage.getAllProviderContracts();
      const settlements = await storage.getAllSettlements();
      const sessions = await storage.getAllReconciliationSessions();
      const dreamReports = await storage.getAllDreamReports();
      const operationalFindings = await storage.getAllOperationalFindings();
      
      // Use database data if available, otherwise use fallback values
      const pendingSettlements = settlements.filter(s => s.status === "proposed" || s.status === "negotiating");
      const draftReports = dreamReports.filter(r => r.status === "draft");
      const scheduledSessions = sessions.filter(s => s.status === "scheduled");
      const openFindings = operationalFindings.filter(f => f.status !== "invalid").length;

      const stats = {
        totalProviders: providerDirectory.length || demoProviders.length,
        activeContracts: providerContracts.filter(c => c.status === "active").length || demoProviderContracts.filter(c => c.status === "active").length,
        pendingSettlements: pendingSettlements.length,
        pendingSettlementValue: pendingSettlements
          .reduce((sum, s) => sum + (s.proposedAmount ? parseFloat(s.proposedAmount) : 0), 0),
        openFindings,
        scheduledSessions: scheduledSessions.length,
        draftReports: draftReports.length,
        avgCpm: "1050.00",
        avgDenialRate: "12.5"
      };
      
      res.json(stats);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/stats", "fetch stats");
    }
  });

  // Provider Communications Endpoints
  app.get("/api/provider-relations/communications", async (req, res) => {
    try {
      const { status, type, providerId } = req.query;
      let communications = await storage.getAllProviderCommunications();
      
      if (status && typeof status === "string") {
        communications = communications.filter(c => c.status === status);
      }
      if (type && typeof type === "string") {
        communications = communications.filter(c => c.type === type);
      }
      if (providerId && typeof providerId === "string") {
        communications = communications.filter(c => c.providerId === providerId);
      }
      
      res.json(communications);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/communications", "fetch communications");
    }
  });

  app.post("/api/provider-relations/communications", async (req, res) => {
    try {
      const communicationCreateSchema = z.object({
        providerId: z.string().min(1, "providerId is required"),
        providerName: z.string().min(1, "providerName is required"),
        type: z.enum(["Email", "Phone", "Meeting", "Letter"]),
        direction: z.enum(["inbound", "outbound"]).optional().default("outbound"),
        subject: z.string().min(1, "subject is required"),
        body: z.string().optional(),
        status: z.enum(["Sent", "Received", "Pending"]).optional().default("Pending"),
        outcome: z.enum(["Resolved", "Follow-up Needed", "Escalate"]).optional(),
        assignee: z.string().optional(),
        nextActionDate: z.string().optional(),
      });
      
      const parseResult = communicationCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }
      
      const { providerId, providerName, type, direction, subject, body, status, outcome, assignee, nextActionDate } = parseResult.data;
      
      const newCommunication = await storage.createProviderCommunication({
        providerId,
        providerName,
        type,
        direction,
        subject,
        body: body || null,
        status,
        outcome: outcome || null,
        assignee: assignee || null,
        nextActionDate: nextActionDate ? new Date(nextActionDate) : null,
      });
      
      res.status(201).json(newCommunication);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/communications", "create communication");
    }
  });

  // Provider Directory Endpoints
  app.get("/api/provider-relations/providers", async (req, res) => {
    try {
      const { status, specialty, networkTier } = req.query;
      let providers = await storage.getAllProviderDirectoryEntries();
      
      if (status && typeof status === "string") {
        providers = providers.filter(p => p.contractStatus === status);
      }
      if (specialty && typeof specialty === "string") {
        providers = providers.filter(p => p.specialty === specialty);
      }
      if (networkTier && typeof networkTier === "string") {
        providers = providers.filter(p => p.networkTier === networkTier);
      }
      
      res.json(providers);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/providers", "fetch providers");
    }
  });

  app.post("/api/provider-relations/providers", async (req, res) => {
    try {
      const providerCreateSchema = z.object({
        npi: z.string().length(10, "NPI must be exactly 10 digits").regex(/^\d{10}$/, "NPI must contain only digits"),
        name: z.string().min(1, "Name is required"),
        specialty: z.string().min(1, "Specialty is required"),
        organization: z.string().optional(),
        email: z.string().email("Invalid email format").optional().or(z.literal("")),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        region: z.string().optional(),
        contractStatus: z.enum(["Active", "Pending", "Expired"]).optional(),
        networkTier: z.enum(["Tier 1", "Tier 2", "Tier 3"]).optional(),
        licenseNumber: z.string().optional(),
        licenseExpiry: z.string().optional(),
      });
      
      const parseResult = providerCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }
      
      const data = parseResult.data;
      
      // Check if NPI already exists
      const existingProvider = await storage.getProviderDirectoryByNpi(data.npi);
      if (existingProvider) {
        return res.status(409).json({ error: "A provider with this NPI already exists" });
      }
      
      const newProvider = await storage.createProviderDirectoryEntry({
        npi: data.npi,
        name: data.name,
        specialty: data.specialty,
        organization: data.organization || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        region: data.region || null,
        contractStatus: data.contractStatus || "Pending",
        networkTier: data.networkTier || "Tier 2",
        licenseNumber: data.licenseNumber || null,
        licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : null,
      });
      
      res.status(201).json(newProvider);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/providers", "create provider");
    }
  });

  // POST /api/provider-relations/providers/batch - Bulk import providers
  app.post("/api/provider-relations/providers/batch", async (req, res) => {
    try {
      const { providers } = req.body;
      
      if (!Array.isArray(providers) || providers.length === 0) {
        return res.status(400).json({ error: "providers array is required" });
      }
      
      let created = 0;
      let skipped = 0;
      const errors: string[] = [];
      
      for (const provider of providers) {
        try {
          // Validate required fields
          if (!provider.npi || !provider.name || !provider.specialty) {
            errors.push(`Missing required fields for provider: ${provider.npi || 'unknown'}`);
            skipped++;
            continue;
          }
          
          // Check for duplicate NPI
          const existing = await storage.getProviderDirectoryByNpi(provider.npi);
          if (existing) {
            skipped++;
            continue;
          }
          
          // Create the provider
          await storage.createProviderDirectoryEntry({
            npi: provider.npi,
            name: provider.name,
            specialty: provider.specialty,
            organization: provider.organization || null,
            email: provider.email || null,
            phone: provider.phone || null,
            networkTier: provider.networkTier || "Tier 2",
            address: provider.address || null,
            city: provider.city || null,
            region: provider.region || null,
            licenseNumber: provider.licenseNumber || null,
            licenseExpiry: provider.licenseExpiry ? new Date(provider.licenseExpiry) : null,
            contractStatus: "Active",
          });
          created++;
        } catch (err: any) {
          if (err.code === '23505') { // Unique constraint violation
            skipped++;
          } else {
            errors.push(`Error importing ${provider.npi}: ${err.message}`);
            skipped++;
          }
        }
      }
      
      res.json({
        created,
        skipped,
        total: providers.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/providers/batch", "bulk import providers");
    }
  });

  // File Import Endpoint
  app.post("/api/provider-relations/import", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { targetModule, columnMappings, mode } = req.body;
      
      if (!targetModule || !["providers", "findings", "claims", "benchmarks"].includes(targetModule)) {
        cleanupFile(file.path);
        return res.status(400).json({ error: "Invalid targetModule. Must be one of: providers, findings, claims, benchmarks" });
      }
      
      if (!mode || !["preview", "import"].includes(mode)) {
        cleanupFile(file.path);
        return res.status(400).json({ error: "Invalid mode. Must be 'preview' or 'import'" });
      }

      let mappings: Record<string, string> = {};
      try {
        mappings = typeof columnMappings === "string" ? JSON.parse(columnMappings) : (columnMappings || {});
      } catch {
        cleanupFile(file.path);
        return res.status(400).json({ error: "Invalid columnMappings format" });
      }

      const ext = path.extname(file.originalname).toLowerCase();
      let rawData: any[] = [];

      try {
        if (ext === ".json") {
          const fileContent = fs.readFileSync(file.path, "utf-8");
          const parsed = JSON.parse(fileContent);
          rawData = Array.isArray(parsed) ? parsed : [parsed];
        } else if (ext === ".csv" || ext === ".xlsx" || ext === ".xls") {
          const workbook = XLSX.readFile(file.path);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          rawData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        } else {
          cleanupFile(file.path);
          return res.status(400).json({ error: "Unsupported file format" });
        }
      } catch (parseError: any) {
        cleanupFile(file.path);
        return res.status(400).json({ error: `Failed to parse file: ${parseError.message}` });
      }

      cleanupFile(file.path);

      if (rawData.length === 0) {
        return res.status(400).json({ error: "File is empty or contains no valid data" });
      }

      const headers = Object.keys(rawData[0]);
      const transformedData = rawData.map(row => {
        const transformed: Record<string, any> = {};
        for (const [fileCol, dbField] of Object.entries(mappings)) {
          if (row.hasOwnProperty(fileCol)) {
            transformed[dbField] = row[fileCol];
          }
        }
        for (const key of Object.keys(row)) {
          if (!mappings[key]) {
            transformed[key] = row[key];
          }
        }
        return transformed;
      });

      const schemaFields = getSchemaFields(targetModule);
      const validationResults = transformedData.map((row, index) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        for (const field of schemaFields.required) {
          if (row[field] === undefined || row[field] === null || row[field] === "") {
            errors.push(`Missing required field: ${field}`);
          }
        }
        
        return {
          row: index + 1,
          data: row,
          valid: errors.length === 0,
          errors,
          warnings
        };
      });

      if (mode === "preview") {
        const previewData = validationResults.slice(0, 100);
        const validCount = previewData.filter(r => r.valid).length;
        const invalidCount = previewData.filter(r => !r.valid).length;
        
        return res.json({
          mode: "preview",
          targetModule,
          headers,
          columnMappings: mappings,
          schemaFields,
          totalRows: rawData.length,
          previewRows: previewData.length,
          validCount,
          invalidCount,
          data: previewData
        });
      }

      let successCount = 0;
      let errorCount = 0;
      const errors: Array<{ row: number; error: string }> = [];

      for (const result of validationResults) {
        if (!result.valid) {
          errorCount++;
          errors.push({ row: result.row, error: result.errors.join(", ") });
          continue;
        }

        try {
          await insertRow(storage, targetModule, result.data);
          successCount++;
        } catch (insertError: any) {
          errorCount++;
          errors.push({ row: result.row, error: insertError.message });
        }
      }

      return res.json({
        mode: "import",
        targetModule,
        totalRows: rawData.length,
        successCount,
        errorCount,
        errors: errors.slice(0, 100)
      });

    } catch (error) {
      if (req.file) cleanupFile(req.file.path);
      handleRouteError(res, error, "/api/provider-relations/import", "import data");
    }
  });

  // Provider Contracts Endpoints
  app.get("/api/provider-relations/contracts", async (req, res) => {
    try {
      const { status, contractType, providerId } = req.query;
      let contracts = await storage.getAllProviderContracts();
      
      if (status && typeof status === "string") {
        contracts = contracts.filter(c => c.status === status);
      }
      if (contractType && typeof contractType === "string") {
        contracts = contracts.filter(c => c.contractType === contractType);
      }
      if (providerId && typeof providerId === "string") {
        contracts = contracts.filter(c => c.providerId === providerId);
      }
      
      res.json(contracts);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/contracts", "fetch contracts");
    }
  });

  app.post("/api/provider-relations/contracts", async (req, res) => {
    try {
      const contractCreateSchema = z.object({
        contractNumber: z.string().min(1, "Contract number is required"),
        providerId: z.string().min(1, "Provider ID is required"),
        providerName: z.string().min(1, "Provider name is required"),
        contractType: z.enum(["Premium Network", "Standard Network", "VIP Network", "Custom"]),
        status: z.string().optional(),
        startDate: z.string().min(1, "Start date is required"),
        endDate: z.string().min(1, "End date is required"),
        value: z.string().optional(),
        feeSchedule: z.string().optional(),
        autoRenewal: z.boolean().optional(),
        notes: z.string().optional(),
      });
      
      const parseResult = contractCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }
      
      const data = parseResult.data;
      
      const newContract = await storage.createProviderContract({
        contractNumber: data.contractNumber,
        providerId: data.providerId,
        providerName: data.providerName,
        contractType: data.contractType,
        status: data.status || "Draft",
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        value: data.value || null,
        feeSchedule: data.feeSchedule || null,
        autoRenewal: data.autoRenewal || false,
        notes: data.notes || null,
      });
      
      res.status(201).json(newContract);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/contracts", "create contract");
    }
  });

  // KPI Definitions Endpoints
  app.get("/api/provider-relations/kpi-definitions", async (req, res) => {
    try {
      const definitions = await storage.getKpiDefinitions();
      res.json(definitions);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/kpi-definitions", "fetch KPI definitions");
    }
  });

  app.get("/api/provider-relations/kpi-definitions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const definition = await storage.getKpiDefinition(id);
      if (!definition) {
        return res.status(404).json({ error: "KPI definition not found" });
      }
      res.json(definition);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/kpi-definitions/:id", "fetch KPI definition");
    }
  });

  app.post("/api/provider-relations/kpi-definitions", async (req, res) => {
    try {
      const parseResult = insertKpiDefinitionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }
      
      const newDefinition = await storage.createKpiDefinition(parseResult.data);
      res.status(201).json(newDefinition);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/kpi-definitions", "create KPI definition");
    }
  });

  app.put("/api/provider-relations/kpi-definitions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateSchema = insertKpiDefinitionSchema.partial();
      const parseResult = updateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }
      
      const updated = await storage.updateKpiDefinition(id, parseResult.data);
      if (!updated) {
        return res.status(404).json({ error: "KPI definition not found" });
      }
      res.json(updated);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/kpi-definitions/:id", "update KPI definition");
    }
  });

  app.delete("/api/provider-relations/kpi-definitions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteKpiDefinition(id);
      if (!deleted) {
        return res.status(404).json({ error: "KPI definition not found" });
      }
      res.status(204).send();
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/kpi-definitions/:id", "delete KPI definition");
    }
  });

  // KPI Results Endpoints
  app.get("/api/provider-relations/kpi-results", async (req, res) => {
    try {
      const { kpiCode, providerId } = req.query;
      const filters: { kpiCode?: string; providerId?: string } = {};
      
      if (kpiCode && typeof kpiCode === "string") {
        filters.kpiCode = kpiCode;
      }
      if (providerId && typeof providerId === "string") {
        filters.providerId = providerId;
      }
      
      const results = await storage.getKpiResults(Object.keys(filters).length > 0 ? filters : undefined);
      res.json(results);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/kpi-results", "fetch KPI results");
    }
  });

  app.post("/api/provider-relations/kpi-results", async (req, res) => {
    try {
      const parseResult = insertKpiResultSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }
      
      const newResult = await storage.createKpiResult(parseResult.data);
      res.status(201).json(newResult);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/kpi-results", "create KPI result");
    }
  });

  // KPI Calculation Endpoint - Triggers calculation for all active KPIs
  app.post("/api/provider-relations/kpi-definitions/calculate", async (req, res) => {
    try {
      const { createKpiCalculatorService } = await import("../services/kpi-calculator");
      const kpiCalculator = createKpiCalculatorService(storage);
      
      const calculateSchema = z.object({
        providerId: z.string().optional(),
        periodStart: z.string().optional(),
        periodEnd: z.string().optional()
      });
      
      const parseResult = calculateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }
      
      const filters: {
        providerId?: string;
        periodStart?: Date;
        periodEnd?: Date;
      } = {};
      
      if (parseResult.data.providerId) {
        filters.providerId = parseResult.data.providerId;
      }
      if (parseResult.data.periodStart) {
        filters.periodStart = new Date(parseResult.data.periodStart);
      }
      if (parseResult.data.periodEnd) {
        filters.periodEnd = new Date(parseResult.data.periodEnd);
      }
      
      const results = await kpiCalculator.calculateAllKpis(filters);
      
      res.json({
        success: true,
        calculatedCount: results.length,
        results: results.map(r => ({
          kpiCode: r.kpiCode,
          kpiName: r.kpiName,
          numeratorValue: r.numeratorValue,
          denominatorValue: r.denominatorValue,
          calculatedValue: r.calculatedValue,
          unit: r.unit,
          displayFormat: r.displayFormat,
          alertLevel: r.alertLevel,
          trend: r.trend,
          peerStats: r.peerStats,
          recordCount: r.recordCount
        }))
      });
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/kpi-definitions/calculate", "calculate KPIs");
    }
  });

  // KPI Dashboard Endpoint - Returns all KPI definitions with their latest calculated values
  app.get("/api/provider-relations/kpi-dashboard", async (req, res) => {
    try {
      const { createKpiCalculatorService } = await import("../services/kpi-calculator");
      const kpiCalculator = createKpiCalculatorService(storage);
      
      const dashboard = await kpiCalculator.getKpiDashboard();
      
      res.json({
        success: true,
        kpis: dashboard.map(item => ({
          id: item.definition.id,
          code: item.definition.code,
          name: item.definition.name,
          description: item.definition.description,
          category: item.definition.category,
          unit: item.definition.unit,
          displayFormat: item.definition.displayFormat,
          enableBenchmarking: item.definition.enableBenchmarking,
          latestResult: item.latestResult ? {
            numeratorValue: item.latestResult.numeratorValue,
            denominatorValue: item.latestResult.denominatorValue,
            calculatedValue: item.latestResult.calculatedValue,
            periodLabel: item.latestResult.periodLabel,
            alertLevel: item.latestResult.alertLevel,
            percentileRank: item.latestResult.percentileRank,
            zScore: item.latestResult.zScore,
            calculatedAt: item.latestResult.calculatedAt
          } : null,
          calculatedValue: item.calculatedValue,
          trend: item.trend
        }))
      });
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/kpi-dashboard", "fetch KPI dashboard");
    }
  });

  // Provider Rankings Endpoint - Returns provider composite scores for ranking
  app.get("/api/provider-relations/provider-rankings", async (req, res) => {
    try {
      const { createKpiCalculatorService } = await import("../services/kpi-calculator");
      const kpiCalculator = createKpiCalculatorService(storage);
      
      const rankings = await kpiCalculator.calculateProviderCompositeScores();
      
      res.json(rankings);
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/provider-rankings", "fetch provider rankings");
    }
  });

  // Seed Demo Claims Data - Generates AI-powered realistic claims for demo purposes
  app.post("/api/provider-relations/seed-demo-claims", async (req, res) => {
    try {
      const { count = 10 } = req.body;
      console.log(`[API] Seeding demo claims for ${count} providers...`);
      
      const result = await demoClaimsSeeder.seedClaimsForTopProviders(count);
      
      res.json({
        success: true,
        message: `Successfully seeded demo claims`,
        providersSeeded: result.providersSeeded,
        claimsGenerated: result.claimsGenerated
      });
    } catch (error) {
      handleRouteError(res, error, "/api/provider-relations/seed-demo-claims", "seed demo claims");
    }
  });
}
