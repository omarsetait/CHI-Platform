import type { Express } from "express";
import type { IStorage } from "../storage";
import { z } from "zod";
import {
  insertPreAuthClaimSchema,
  insertPreAuthSignalSchema,
  insertPreAuthDecisionSchema,
  insertPreAuthAdjudicatorActionSchema,
  insertPreAuthDocumentSchema,
  insertPreAuthPolicyRuleSchema,
  insertPreAuthAgentConfigSchema,
  insertPreAuthBatchSchema,
} from "@shared/schema";

interface ABTest {
  id: string;
  name: string;
  description: string;
  status: "active" | "completed" | "paused";
  variantA: { agentId: string; name: string };
  variantB: { agentId: string; name: string };
  sampleSize: number;
  currentSamples: number;
  startDate: Date;
  endDate?: Date;
  results?: {
    variantAAcceptance: number;
    variantBAcceptance: number;
    winner?: string;
  };
}

const abTests: Map<string, ABTest> = new Map();

export function registerPreAuthRoutes(
  app: Express,
  storage: IStorage,
  handleRouteError: (res: any, error: unknown, routePath: string, operation?: string) => void
) {
  // GET /api/pre-auth/stats - Dashboard statistics
  app.get("/api/pre-auth/stats", async (req, res) => {
    try {
      const claims = await storage.getPreAuthClaims();
      const totalClaims = claims.length;
      const pendingReview = claims.filter((c) => c.status === "pending_review").length;
      const approved = claims.filter((c) => c.status === "approved").length;
      const rejected = claims.filter((c) => c.status === "rejected").length;
      
      let riskFlags = 0;
      for (const claim of claims) {
        const signals = await storage.getPreAuthSignalsByClaimId(claim.id);
        riskFlags += signals.filter((s) => s.riskFlag).length;
      }
      
      const avgProcessingTime = totalClaims > 0 ? "2.4 hours" : "N/A";
      
      res.json({
        totalClaims,
        pendingReview,
        approved,
        rejected,
        riskFlags,
        avgProcessingTime,
      });
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/stats", "fetch stats");
    }
  });

  // GET /api/pre-auth/analytics/overview - Aggregated overview stats
  app.get("/api/pre-auth/analytics/overview", async (req, res) => {
    try {
      const claims = await storage.getPreAuthClaims();
      const actions = await storage.getPreAuthAllActions();

      const totalClaims = claims.length;
      const approved = claims.filter((c) => c.status === "approved").length;
      const rejected = claims.filter((c) => c.status === "rejected").length;
      const pendingReview = claims.filter((c) => c.status === "pending_review").length;
      const requestInfo = claims.filter((c) => c.status === "request_info").length;

      const processedCount = approved + rejected;
      const approvalRate = processedCount > 0 ? Math.round((approved / processedCount) * 100 * 10) / 10 : 0;

      const totalActions = actions.length;
      const totalOverrides = actions.filter((a) => a.overrideReason !== null && a.overrideReason !== "").length;
      const overrideRate = totalActions > 0 ? Math.round((totalOverrides / totalActions) * 100 * 10) / 10 : 0;

      // Compute average processing time from claims that have timestamps
      const claimsWithTime = claims.filter((c) => c.createdAt && c.updatedAt);
      let avgProcessingTime = "0s";
      if (claimsWithTime.length > 0) {
        const totalMs = claimsWithTime.reduce((sum, c) => {
          const created = new Date(c.createdAt!).getTime();
          const updated = new Date(c.updatedAt!).getTime();
          return sum + (updated - created);
        }, 0);
        const avgMs = totalMs / claimsWithTime.length;
        if (avgMs < 1000) {
          avgProcessingTime = `${Math.round(avgMs)}ms`;
        } else if (avgMs < 60000) {
          avgProcessingTime = `${(avgMs / 1000).toFixed(1)}s`;
        } else if (avgMs < 3600000) {
          avgProcessingTime = `${(avgMs / 60000).toFixed(1)}m`;
        } else {
          avgProcessingTime = `${(avgMs / 3600000).toFixed(1)}h`;
        }
      }

      res.json({
        totalClaims,
        approved,
        rejected,
        pendingReview,
        requestInfo,
        approvalRate,
        overrideRate,
        avgProcessingTime,
        totalActions,
        totalOverrides,
      });
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/analytics/overview", "fetch analytics overview");
    }
  });

  // GET /api/pre-auth/analytics/claims-by-status - Group claims by status
  app.get("/api/pre-auth/analytics/claims-by-status", async (req, res) => {
    try {
      const claims = await storage.getPreAuthClaims();
      const total = claims.length;
      const statusCounts: Record<string, number> = {};
      claims.forEach((c) => {
        const status = c.status || "unknown";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const distribution = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0,
      }));

      res.json({ distribution, total });
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/analytics/claims-by-status", "fetch claims by status");
    }
  });

  // GET /api/pre-auth/analytics/claims-trend - Daily trend for last 30 days
  app.get("/api/pre-auth/analytics/claims-trend", async (req, res) => {
    try {
      const claims = await storage.getPreAuthClaims();
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Build a map of date -> { submitted, approved, rejected }
      const dayMap: Record<string, { submitted: number; approved: number; rejected: number }> = {};

      // Initialize all 30 days
      for (let i = 0; i < 30; i++) {
        const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split("T")[0];
        dayMap[key] = { submitted: 0, approved: 0, rejected: 0 };
      }

      claims.forEach((c) => {
        if (!c.createdAt) return;
        const date = new Date(c.createdAt);
        if (date < thirtyDaysAgo) return;
        const key = date.toISOString().split("T")[0];
        if (!dayMap[key]) {
          dayMap[key] = { submitted: 0, approved: 0, rejected: 0 };
        }
        dayMap[key].submitted += 1;
        if (c.status === "approved") dayMap[key].approved += 1;
        if (c.status === "rejected") dayMap[key].rejected += 1;
      });

      const trend = Object.entries(dayMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, counts]) => ({ date, ...counts }));

      res.json({ trend });
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/analytics/claims-trend", "fetch claims trend");
    }
  });

  // GET /api/pre-auth/analytics/agent-performance - Agent signal stats
  app.get("/api/pre-auth/analytics/agent-performance", async (req, res) => {
    try {
      // Try agent_performance_metrics table first
      const metricsFromTable = await storage.getAgentPerformanceMetricsByModule("pre-auth");
      if (metricsFromTable.length > 0) {
        const performance = metricsFromTable.map((m) => ({
          detector: m.agentId,
          signalCount: m.totalRecommendations || 0,
          avgConfidence: m.confidenceAccuracy ? parseFloat(String(m.confidenceAccuracy)) / 100 : 0,
          riskFlagCount: m.overriddenRecommendations || 0,
          hardStopCount: m.escalatedRecommendations || 0,
          riskFlagRate: m.totalRecommendations
            ? Math.round(((m.overriddenRecommendations || 0) / m.totalRecommendations) * 100 * 10) / 10
            : 0,
          recommendations: {
            accepted: m.acceptedRecommendations || 0,
            overridden: m.overriddenRecommendations || 0,
            escalated: m.escalatedRecommendations || 0,
          },
        }));
        return res.json({ performance });
      }

      // Fallback: compute from signals
      const signals = await storage.getPreAuthAllSignals();
      const detectorMap: Record<string, {
        signalCount: number;
        totalConfidence: number;
        riskFlagCount: number;
        hardStopCount: number;
        recommendations: Record<string, number>;
      }> = {};

      signals.forEach((s) => {
        const detector = s.detector;
        if (!detectorMap[detector]) {
          detectorMap[detector] = {
            signalCount: 0,
            totalConfidence: 0,
            riskFlagCount: 0,
            hardStopCount: 0,
            recommendations: {},
          };
        }
        const entry = detectorMap[detector];
        entry.signalCount += 1;
        entry.totalConfidence += s.confidence ? parseFloat(String(s.confidence)) : 0;
        if (s.riskFlag) entry.riskFlagCount += 1;
        if (s.isHardStop) entry.hardStopCount += 1;
        if (s.recommendation) {
          entry.recommendations[s.recommendation] = (entry.recommendations[s.recommendation] || 0) + 1;
        }
      });

      const performance = Object.entries(detectorMap).map(([detector, data]) => ({
        detector,
        signalCount: data.signalCount,
        avgConfidence: data.signalCount > 0 ? data.totalConfidence / data.signalCount : 0,
        riskFlagCount: data.riskFlagCount,
        hardStopCount: data.hardStopCount,
        riskFlagRate: data.signalCount > 0
          ? Math.round((data.riskFlagCount / data.signalCount) * 100 * 10) / 10
          : 0,
        recommendations: data.recommendations,
      }));

      res.json({ performance });
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/analytics/agent-performance", "fetch agent performance");
    }
  });

  // GET /api/pre-auth/analytics/override-patterns - Override analysis
  app.get("/api/pre-auth/analytics/override-patterns", async (req, res) => {
    try {
      const actions = await storage.getPreAuthAllActions();
      const overrides = actions.filter((a) => a.overrideReason !== null && a.overrideReason !== "");
      const totalOverrides = overrides.length;

      // Group by category (use action field as category)
      const categoryMap: Record<string, number> = {};
      overrides.forEach((o) => {
        const category = o.action || "unknown";
        categoryMap[category] = (categoryMap[category] || 0) + 1;
      });
      const byCategory = Object.entries(categoryMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      // Group by reason
      const reasonMap: Record<string, number> = {};
      overrides.forEach((o) => {
        const reason = o.overrideReason || "unspecified";
        reasonMap[reason] = (reasonMap[reason] || 0) + 1;
      });
      const byReason = Object.entries(reasonMap)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);

      // Group by verdict change (originalRecommendation -> finalVerdict)
      const verdictChangeMap: Record<string, number> = {};
      overrides.forEach((o) => {
        const from = o.originalRecommendation || "unknown";
        const to = o.finalVerdict || "unknown";
        const change = `${from} -> ${to}`;
        verdictChangeMap[change] = (verdictChangeMap[change] || 0) + 1;
      });
      const byVerdictChange = Object.entries(verdictChangeMap)
        .map(([change, count]) => ({ change, count }))
        .sort((a, b) => b.count - a.count);

      res.json({ totalOverrides, byCategory, byReason, byVerdictChange });
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/analytics/override-patterns", "fetch override patterns");
    }
  });

  // POST /api/pre-auth/seed - Seed sample data for demo
  app.post("/api/pre-auth/seed", async (req, res) => {
    try {
      const existingClaims = await storage.getPreAuthClaims();
      if (existingClaims.length > 0) {
        return res.json({ message: "Data already seeded", claims: existingClaims.length });
      }

      const existingRules = await storage.getPreAuthPolicyRules();
      if (existingRules.length === 0) {
        const defaultRules = [
          { ruleId: "REG-001", ruleName: "CCHI Compliance Check", ruleType: "regulatory", layer: 1, action: "flag", severity: "HIGH" as const, isActive: true },
          { ruleId: "COV-001", ruleName: "Policy Active Check", ruleType: "coverage", layer: 2, action: "reject", severity: "HIGH" as const, isActive: true },
          { ruleId: "CLIN-001", ruleName: "Medical Necessity Review", ruleType: "clinical", layer: 3, action: "review", severity: "MEDIUM" as const, isActive: true },
          { ruleId: "PAT-001", ruleName: "Historical Claim Pattern Check", ruleType: "pattern", layer: 4, action: "flag", severity: "MEDIUM" as const, isActive: true },
          { ruleId: "DIS-001", ruleName: "Pre-existing Condition Check", ruleType: "disclosure", layer: 5, action: "review", severity: "LOW" as const, isActive: true },
        ];
        await Promise.all(defaultRules.map((rule) => storage.createPreAuthPolicyRule(rule)));
      }

      const existingConfigs = await storage.getPreAuthAgentConfigs();
      if (existingConfigs.length === 0) {
        const defaultConfigs = [
          { agentId: "regulatory-agent", agentName: "Regulatory Compliance Agent", layer: 1, modelProvider: "OpenAI", modelName: "gpt-4o", temperature: "0.1", maxTokens: 4096, systemPrompt: "Analyze claims for regulatory compliance.", weight: "1.0", isActive: true },
          { agentId: "coverage-agent", agentName: "Coverage Eligibility Agent", layer: 2, modelProvider: "OpenAI", modelName: "gpt-4o", temperature: "0.1", maxTokens: 4096, systemPrompt: "Verify policy coverage.", weight: "1.0", isActive: true },
          { agentId: "clinical-agent", agentName: "Clinical Necessity Agent", layer: 3, modelProvider: "OpenAI", modelName: "gpt-4o", temperature: "0.2", maxTokens: 8192, systemPrompt: "Assess medical necessity.", weight: "1.2", isActive: true },
          { agentId: "pattern-agent", agentName: "Historical Patterns Agent", layer: 4, modelProvider: "OpenAI", modelName: "gpt-4o-mini", temperature: "0.1", maxTokens: 4096, systemPrompt: "Detect claim anomalies.", weight: "0.8", isActive: true },
          { agentId: "disclosure-agent", agentName: "Disclosure Check Agent", layer: 5, modelProvider: "OpenAI", modelName: "gpt-4o-mini", temperature: "0.1", maxTokens: 4096, systemPrompt: "Check disclosure compliance.", weight: "0.7", isActive: true },
        ];
        await Promise.all(defaultConfigs.map((config) => storage.createPreAuthAgentConfig(config)));
      }

      const sampleClaims = [
        { claimId: "PA-20250101-001", payerId: "PAYER-001", memberId: "MEM-10001", memberDob: "1985-03-15", memberGender: "M", policyPlanId: "GOLD-2024", providerId: "PROV-501", specialty: "Cardiology", networkStatus: "in-network", encounterType: "outpatient", totalAmount: "5250.00", status: "ingested" as const, priority: "NORMAL" as const, diagnoses: [{ code_system: "ICD-10", code: "I25.10", desc: "Atherosclerotic heart disease", type: "primary" }], lineItems: [{ line_id: "L1", code_type: "CPT", code: "93306", desc: "Echocardiography", units: 1, net_amount: 2500 }] },
        { claimId: "PA-20250101-002", payerId: "PAYER-001", memberId: "MEM-10002", memberDob: "1978-07-22", memberGender: "F", policyPlanId: "SILVER-2024", providerId: "PROV-302", specialty: "Orthopedics", networkStatus: "in-network", encounterType: "inpatient", totalAmount: "45000.00", status: "analyzing" as const, priority: "HIGH" as const, diagnoses: [{ code_system: "ICD-10", code: "M17.11", desc: "Primary osteoarthritis, right knee", type: "primary" }], lineItems: [{ line_id: "L1", code_type: "CPT", code: "27447", desc: "Total knee replacement", units: 1, net_amount: 35000 }] },
        { claimId: "PA-20250101-003", payerId: "PAYER-002", memberId: "MEM-20003", memberDob: "1990-11-08", memberGender: "M", policyPlanId: "PLATINUM-2024", providerId: "PROV-201", specialty: "Oncology", networkStatus: "out-of-network", encounterType: "inpatient", totalAmount: "125000.00", status: "pending_review" as const, priority: "HIGH" as const, diagnoses: [{ code_system: "ICD-10", code: "C34.90", desc: "Malignant neoplasm of lung", type: "primary" }], lineItems: [{ line_id: "L1", code_type: "CPT", code: "32480", desc: "Lobectomy", units: 1, net_amount: 85000 }] },
        { claimId: "PA-20250101-004", payerId: "PAYER-001", memberId: "MEM-10004", memberDob: "1965-02-28", memberGender: "F", policyPlanId: "GOLD-2024", providerId: "PROV-401", specialty: "Neurology", networkStatus: "in-network", encounterType: "outpatient", totalAmount: "3200.00", status: "approved" as const, priority: "NORMAL" as const, diagnoses: [{ code_system: "ICD-10", code: "G43.909", desc: "Migraine, unspecified", type: "primary" }], lineItems: [{ line_id: "L1", code_type: "CPT", code: "70553", desc: "MRI brain with contrast", units: 1, net_amount: 2800 }] },
        { claimId: "PA-20250101-005", payerId: "PAYER-003", memberId: "MEM-30005", memberDob: "1995-09-12", memberGender: "M", policyPlanId: "BRONZE-2024", providerId: "PROV-601", specialty: "Dermatology", networkStatus: "in-network", encounterType: "outpatient", totalAmount: "850.00", status: "rejected" as const, priority: "LOW" as const, diagnoses: [{ code_system: "ICD-10", code: "L70.0", desc: "Acne vulgaris", type: "primary" }], lineItems: [{ line_id: "L1", code_type: "CPT", code: "17110", desc: "Destruction of benign lesions", units: 1, net_amount: 650 }] },
      ];

      const createdClaims = await Promise.all(
        sampleClaims.map((claim) => storage.createPreAuthClaim(claim))
      );

      const signalTypes = ["regulatory_compliance", "coverage_eligibility", "clinical_necessity", "past_patterns", "disclosure_check"] as const;
      const recommendations = ["APPROVE", "REJECT", "PEND_REVIEW", "REQUEST_INFO"] as const;
      const severities = ["HIGH", "MEDIUM", "LOW"] as const;

      for (const claim of createdClaims) {
        const numSignals = Math.floor(Math.random() * 3) + 2;
        for (let i = 0; i < numSignals; i++) {
          const detector = signalTypes[i % signalTypes.length];
          const isRisk = Math.random() > 0.6;
          await storage.createPreAuthSignal({
            claimId: claim.id,
            detector,
            signalId: `SIG-${claim.claimId}-${i + 1}`,
            riskFlag: isRisk,
            severity: isRisk ? severities[Math.floor(Math.random() * severities.length)] : null,
            confidence: (0.7 + Math.random() * 0.25).toFixed(4),
            recommendation: recommendations[Math.floor(Math.random() * recommendations.length)],
            rationale: `Automated analysis for ${detector.replace("_", " ")}`,
            evidence: [{ source: "policy_document", quote: "Sample evidence text" }],
          });
        }

        if (claim.status === "approved" || claim.status === "rejected" || claim.status === "pending_review") {
          await storage.createPreAuthDecision({
            claimId: claim.id,
            aggregatedScore: (0.5 + Math.random() * 0.4).toFixed(4),
            riskLevel: severities[Math.floor(Math.random() * severities.length)],
            hasHardStop: claim.status === "rejected",
            candidates: [
              { rank: 1, recommendation: claim.status === "approved" ? "APPROVE" : claim.status === "rejected" ? "REJECT" : "PEND_REVIEW", score: 0.85, rationale: "Primary recommendation" },
            ],
            topRecommendation: claim.status === "approved" ? "APPROVE" : claim.status === "rejected" ? "REJECT" : "PEND_REVIEW",
            safetyCheckPassed: claim.status !== "rejected",
            isFinal: claim.status !== "pending_review",
          });
        }
      }

      res.status(201).json({ message: "Sample data seeded successfully", claims: createdClaims.length });
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/seed", "seed data");
    }
  });

  // GET /api/pre-auth/claims - List all claims with optional status filter
  app.get("/api/pre-auth/claims", async (req, res) => {
    try {
      const { status } = req.query;
      let claims = await storage.getPreAuthClaims();
      if (status && typeof status === "string") {
        claims = claims.filter((c) => c.status === status);
      }
      res.json(claims);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/claims", "fetch claims");
    }
  });

  // GET /api/pre-auth/claims/recent - Get 10 most recent claims
  app.get("/api/pre-auth/claims/recent", async (req, res) => {
    try {
      const claims = await storage.getPreAuthClaims();
      const sorted = claims.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      res.json(sorted.slice(0, 10));
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/claims/recent", "fetch recent claims");
    }
  });

  // GET /api/pre-auth/claims/pending - Get claims with pending_review status
  app.get("/api/pre-auth/claims/pending", async (req, res) => {
    try {
      const claims = await storage.getPreAuthClaims();
      const pending = claims.filter(c => c.status === "pending_review");
      res.json(pending);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/claims/pending", "fetch pending claims");
    }
  });

  // GET /api/pre-auth/claims/by-claim-id/:claimId - Get claim by claimId string
  app.get("/api/pre-auth/claims/by-claim-id/:claimId", async (req, res) => {
    try {
      const claim = await storage.getPreAuthClaimByClaimId(req.params.claimId);
      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }
      res.json(claim);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/claims/by-claim-id/:claimId", "fetch claim");
    }
  });

  // GET /api/pre-auth/claims/:id - Get single claim by ID
  app.get("/api/pre-auth/claims/:id", async (req, res) => {
    try {
      const claim = await storage.getPreAuthClaim(req.params.id);
      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }
      res.json(claim);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/claims/:id", "fetch claim");
    }
  });

  // POST /api/pre-auth/claims - Create new claim
  app.post("/api/pre-auth/claims", async (req, res) => {
    try {
      const parsed = insertPreAuthClaimSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const claim = await storage.createPreAuthClaim(parsed.data);
      res.status(201).json(claim);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/claims", "create claim");
    }
  });

  // PATCH /api/pre-auth/claims/:id - Update claim
  app.patch("/api/pre-auth/claims/:id", async (req, res) => {
    try {
      const partialSchema = insertPreAuthClaimSchema.partial();
      const parsed = partialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const claim = await storage.updatePreAuthClaim(req.params.id, parsed.data);
      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }
      res.json(claim);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/claims/:id", "update claim");
    }
  });

  // DELETE /api/pre-auth/claims/:id - Delete claim
  app.delete("/api/pre-auth/claims/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePreAuthClaim(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Claim not found" });
      }
      res.status(204).send();
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/claims/:id", "delete claim");
    }
  });

  // POST /api/pre-auth/claims/batch - Create multiple claims
  app.post("/api/pre-auth/claims/batch", async (req, res) => {
    try {
      const claimsArraySchema = z.array(insertPreAuthClaimSchema);
      const parsed = claimsArraySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const createdClaims = await Promise.all(
        parsed.data.map((claim) => storage.createPreAuthClaim(claim))
      );
      res.status(201).json(createdClaims);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/claims/batch", "create claims");
    }
  });

  // GET /api/pre-auth/claims/:id/signals - Get signals for a claim
  app.get("/api/pre-auth/claims/:id/signals", async (req, res) => {
    try {
      const idParam = req.params.id;
      let signals = await storage.getPreAuthSignalsByClaimId(idParam);
      if (signals.length === 0) {
        const claim = await storage.getPreAuthClaimByClaimId(idParam);
        if (claim) {
          signals = await storage.getPreAuthSignalsByClaimId(claim.id);
        }
      }
      res.json(signals);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/claims/:id/signals", "fetch signals");
    }
  });

  // POST /api/pre-auth/claims/:claimId/signals - Create signal
  app.post("/api/pre-auth/claims/:claimId/signals", async (req, res) => {
    try {
      const parsed = insertPreAuthSignalSchema.safeParse({
        ...req.body,
        claimId: req.params.claimId,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const signal = await storage.createPreAuthSignal(parsed.data);
      res.status(201).json(signal);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/claims/:claimId/signals", "create signal");
    }
  });

  // GET /api/pre-auth/claims/:claimId/decision - Get decision for claim
  app.get("/api/pre-auth/claims/:claimId/decision", async (req, res) => {
    try {
      const decision = await storage.getPreAuthDecisionByClaimId(req.params.claimId);
      if (!decision) {
        return res.status(404).json({ error: "Decision not found" });
      }
      res.json(decision);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/claims/:claimId/decision", "fetch decision");
    }
  });

  // POST /api/pre-auth/claims/:claimId/decision - Create/update decision
  app.post("/api/pre-auth/claims/:claimId/decision", async (req, res) => {
    try {
      const parsed = insertPreAuthDecisionSchema.safeParse({
        ...req.body,
        claimId: req.params.claimId,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const decision = await storage.createPreAuthDecision(parsed.data);
      res.status(201).json(decision);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/claims/:claimId/decision", "create decision");
    }
  });

  // GET /api/pre-auth/claims/:claimId/actions - Get actions for claim
  app.get("/api/pre-auth/claims/:claimId/actions", async (req, res) => {
    try {
      const decision = await storage.getPreAuthDecisionByClaimId(req.params.claimId);
      res.json(decision ? [decision] : []);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/claims/:claimId/actions", "fetch actions");
    }
  });

  // POST /api/pre-auth/claims/:claimId/actions - Create action
  app.post("/api/pre-auth/claims/:claimId/actions", async (req, res) => {
    try {
      const parsed = insertPreAuthAdjudicatorActionSchema.safeParse({
        ...req.body,
        claimId: req.params.claimId,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const action = await storage.createPreAuthDecision(parsed.data as any);
      res.status(201).json(action);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/claims/:claimId/actions", "create action");
    }
  });

  // GET /api/pre-auth/documents - List all documents
  app.get("/api/pre-auth/documents", async (req, res) => {
    try {
      const documents = await storage.getPreAuthDocuments();
      res.json(documents);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/documents", "fetch documents");
    }
  });

  // GET /api/pre-auth/documents/:id - Get single document
  app.get("/api/pre-auth/documents/:id", async (req, res) => {
    try {
      const document = await storage.getPreAuthDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/documents/:id", "fetch document");
    }
  });

  // GET /api/pre-auth/documents/:id/chunks - Get document chunks
  app.get("/api/pre-auth/documents/:id/chunks", async (req, res) => {
    try {
      const chunks = await storage.getPreAuthDocumentChunks(req.params.id);
      res.json(chunks);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/documents/:id/chunks", "fetch document chunks");
    }
  });

  // POST /api/pre-auth/documents - Create document
  app.post("/api/pre-auth/documents", async (req, res) => {
    try {
      const parsed = insertPreAuthDocumentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const document = await storage.createPreAuthDocument(parsed.data);
      res.status(201).json(document);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/documents", "create document");
    }
  });

  // POST /api/pre-auth/documents/batch - Batch upload documents
  app.post("/api/pre-auth/documents/batch", async (req, res) => {
    try {
      const docsArraySchema = z.array(insertPreAuthDocumentSchema);
      const parsed = docsArraySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const createdDocs = await Promise.all(
        parsed.data.map((doc) => storage.createPreAuthDocument(doc))
      );
      res.status(201).json(createdDocs);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/documents/batch", "create documents");
    }
  });

  // DELETE /api/pre-auth/documents/:id - Delete document
  app.delete("/api/pre-auth/documents/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePreAuthDocument(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.status(204).send();
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/documents/:id", "delete document");
    }
  });

  // GET /api/pre-auth/policy-rules - List all rules
  app.get("/api/pre-auth/policy-rules", async (req, res) => {
    try {
      const rules = await storage.getPreAuthPolicyRules();
      res.json(rules);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/policy-rules", "fetch policy rules");
    }
  });

  // POST /api/pre-auth/policy-rules - Create rule
  app.post("/api/pre-auth/policy-rules", async (req, res) => {
    try {
      const parsed = insertPreAuthPolicyRuleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const rule = await storage.createPreAuthPolicyRule(parsed.data);
      res.status(201).json(rule);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/policy-rules", "create policy rule");
    }
  });

  // PUT /api/pre-auth/policy-rules/:id - Update rule
  app.put("/api/pre-auth/policy-rules/:id", async (req, res) => {
    try {
      const partialSchema = insertPreAuthPolicyRuleSchema.partial();
      const parsed = partialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const rule = await storage.updatePreAuthPolicyRule(req.params.id, parsed.data);
      if (!rule) {
        return res.status(404).json({ error: "Policy rule not found" });
      }
      res.json(rule);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/policy-rules/:id", "update policy rule");
    }
  });

  // DELETE /api/pre-auth/policy-rules/:id - Delete rule
  app.delete("/api/pre-auth/policy-rules/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePreAuthPolicyRule(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Policy rule not found" });
      }
      res.status(204).send();
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/policy-rules/:id", "delete policy rule");
    }
  });

  // POST /api/pre-auth/policy-rules/seed - Seed default rules
  app.post("/api/pre-auth/policy-rules/seed", async (req, res) => {
    try {
      const defaultRules: Array<{
        ruleId: string;
        ruleName: string;
        ruleType: string;
        layer: number;
        action: string;
        severity: "HIGH" | "MEDIUM" | "LOW";
        isActive: boolean;
        condition?: { field: string; operator: string; value: any } | null;
      }> = [
        { ruleId: "REG-001", ruleName: "CCHI Compliance Check", ruleType: "regulatory", layer: 1, action: "flag", severity: "HIGH", isActive: true, condition: { field: "diagnoses", operator: "missing_cchi_code", value: null } },
        { ruleId: "COV-001", ruleName: "Policy Active Check", ruleType: "coverage", layer: 2, action: "reject", severity: "HIGH", isActive: true, condition: { field: "policy_status", operator: "not_equals", value: "active" } },
        { ruleId: "CLIN-001", ruleName: "Medical Necessity Review", ruleType: "clinical", layer: 3, action: "review", severity: "MEDIUM", isActive: true, condition: { field: "clinical_evidence", operator: "insufficient", value: null } },
        { ruleId: "PAT-001", ruleName: "Historical Claim Pattern Check", ruleType: "pattern", layer: 4, action: "flag", severity: "MEDIUM", isActive: true, condition: { field: "claim_frequency", operator: "exceeds", value: 5 } },
        { ruleId: "DIS-001", ruleName: "Pre-existing Condition Check", ruleType: "disclosure", layer: 5, action: "review", severity: "LOW", isActive: true, condition: { field: "disclosure_form", operator: "missing_field", value: "pre_existing" } },
      ];
      const createdRules = await Promise.all(
        defaultRules.map((rule) => storage.createPreAuthPolicyRule(rule))
      );
      res.status(201).json(createdRules);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/policy-rules/seed", "seed policy rules");
    }
  });

  // GET /api/pre-auth/agent-configs - List all configs
  app.get("/api/pre-auth/agent-configs", async (req, res) => {
    try {
      const configs = await storage.getPreAuthAgentConfigs();
      res.json(configs);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/agent-configs", "fetch agent configs");
    }
  });

  // GET /api/pre-auth/agent-configs/:agentId - Get specific agent config
  app.get("/api/pre-auth/agent-configs/:agentId", async (req, res) => {
    try {
      const config = await storage.getPreAuthAgentConfig(req.params.agentId);
      if (!config) {
        return res.status(404).json({ error: "Agent config not found" });
      }
      res.json(config);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/agent-configs/:agentId", "fetch agent config");
    }
  });

  // POST /api/pre-auth/agent-configs - Create config
  app.post("/api/pre-auth/agent-configs", async (req, res) => {
    try {
      const parsed = insertPreAuthAgentConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const config = await storage.createPreAuthAgentConfig(parsed.data);
      res.status(201).json(config);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/agent-configs", "create agent config");
    }
  });

  // PUT /api/pre-auth/agent-configs/:agentId - Update config
  app.put("/api/pre-auth/agent-configs/:agentId", async (req, res) => {
    try {
      const partialSchema = insertPreAuthAgentConfigSchema.partial();
      const parsed = partialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const config = await storage.updatePreAuthAgentConfig(req.params.agentId, parsed.data);
      if (!config) {
        return res.status(404).json({ error: "Agent config not found" });
      }
      res.json(config);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/agent-configs/:agentId", "update agent config");
    }
  });

  // POST /api/pre-auth/agent-configs/seed - Seed default agent configs
  app.post("/api/pre-auth/agent-configs/seed", async (req, res) => {
    try {
      const defaultConfigs = [
        { agentId: "regulatory-agent", agentName: "Regulatory Compliance Agent", layer: 1, modelProvider: "OpenAI", modelName: "gpt-4o", temperature: "0.1", maxTokens: 4096, systemPrompt: "You are a regulatory compliance expert. Analyze claims for CCHI and regulatory compliance issues.", weight: "1.0", isActive: true },
        { agentId: "coverage-agent", agentName: "Coverage Eligibility Agent", layer: 2, modelProvider: "OpenAI", modelName: "gpt-4o", temperature: "0.1", maxTokens: 4096, systemPrompt: "You are a coverage eligibility expert. Verify policy coverage and member eligibility.", weight: "1.0", isActive: true },
        { agentId: "clinical-agent", agentName: "Clinical Necessity Agent", layer: 3, modelProvider: "OpenAI", modelName: "gpt-4o", temperature: "0.2", maxTokens: 8192, systemPrompt: "You are a clinical medical expert. Assess medical necessity based on clinical guidelines.", weight: "1.2", isActive: true },
        { agentId: "pattern-agent", agentName: "Historical Patterns Agent", layer: 4, modelProvider: "OpenAI", modelName: "gpt-4o-mini", temperature: "0.1", maxTokens: 4096, systemPrompt: "You analyze historical claim patterns to detect anomalies and potential fraud.", weight: "0.8", isActive: true },
        { agentId: "disclosure-agent", agentName: "Disclosure Verification Agent", layer: 5, modelProvider: "OpenAI", modelName: "gpt-4o-mini", temperature: "0.1", maxTokens: 4096, systemPrompt: "You verify member disclosure forms and detect pre-existing condition discrepancies.", weight: "0.9", isActive: true },
        { agentId: "aggregator-agent", agentName: "Decision Aggregator Agent", layer: 6, modelProvider: "OpenAI", modelName: "gpt-4o", temperature: "0.0", maxTokens: 8192, systemPrompt: "You aggregate signals from all agents and produce final recommendations.", weight: "1.0", isActive: true },
      ];
      const createdConfigs = await Promise.all(
        defaultConfigs.map((config) => storage.createPreAuthAgentConfig(config))
      );
      res.status(201).json(createdConfigs);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/agent-configs/seed", "seed agent configs");
    }
  });

  // RLHF Routes
  app.get("/api/pre-auth/rlhf/feedback-analysis", async (req, res) => {
    try {
      const feedback = await storage.getPreAuthRlhfFeedback();
      const totalFeedback = feedback.length;
      const acceptedCount = feedback.filter((f) => f.wasAccepted === true).length;
      const rejectedCount = feedback.filter((f) => f.wasAccepted === false).length;
      const curatedCount = feedback.filter((f) => f.curatedForTraining === true).length;
      
      const agentStats: Record<string, { accepted: number; rejected: number; total: number }> = {};
      feedback.forEach((f) => {
        if (f.agentId) {
          if (!agentStats[f.agentId]) {
            agentStats[f.agentId] = { accepted: 0, rejected: 0, total: 0 };
          }
          agentStats[f.agentId].total++;
          if (f.wasAccepted === true) agentStats[f.agentId].accepted++;
          if (f.wasAccepted === false) agentStats[f.agentId].rejected++;
        }
      });

      res.json({
        totalFeedback,
        acceptedCount,
        rejectedCount,
        curatedCount,
        acceptanceRate: totalFeedback > 0 ? (acceptedCount / totalFeedback) * 100 : 0,
        agentStats,
      });
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/rlhf/feedback-analysis", "fetch feedback analysis");
    }
  });

  app.get("/api/pre-auth/rlhf/training-data", async (req, res) => {
    try {
      const { format } = req.query;
      const feedback = await storage.getPreAuthRlhfFeedback();
      const curatedFeedback = feedback.filter((f) => f.curatedForTraining === true);

      if (format === "jsonl") {
        const jsonlData = curatedFeedback
          .map((f) => JSON.stringify({
            claimId: f.claimId,
            agentId: f.agentId,
            feedbackType: f.feedbackType,
            wasAccepted: f.wasAccepted,
            preferenceScore: f.preferenceScore,
          }))
          .join("\n");
        res.set("Content-Type", "application/x-ndjson");
        res.send(jsonlData);
      } else {
        res.json(curatedFeedback);
      }
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/rlhf/training-data", "fetch training data");
    }
  });

  app.patch("/api/pre-auth/rlhf/feedback/:id/curate", async (req, res) => {
    try {
      const { curatedForTraining } = req.body;
      if (typeof curatedForTraining !== "boolean") {
        return res.status(400).json({ error: "curatedForTraining must be a boolean" });
      }
      const updated = await storage.updatePreAuthRlhfFeedback(req.params.id, { curatedForTraining });
      if (!updated) {
        return res.status(404).json({ error: "Feedback not found" });
      }
      res.json(updated);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/rlhf/feedback/:id/curate", "update feedback");
    }
  });

  app.get("/api/pre-auth/rlhf/ab-tests", async (req, res) => {
    try {
      res.json(Array.from(abTests.values()));
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/rlhf/ab-tests", "fetch A/B tests");
    }
  });

  app.post("/api/pre-auth/rlhf/ab-tests", async (req, res) => {
    try {
      const abTestSchema = z.object({
        name: z.string(),
        description: z.string().optional(),
        variantA: z.object({ agentId: z.string(), name: z.string() }),
        variantB: z.object({ agentId: z.string(), name: z.string() }),
        sampleSize: z.number().min(1),
      });
      const parsed = abTestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const id = `ab-${Date.now()}`;
      const newTest: ABTest = {
        id,
        name: parsed.data.name,
        description: parsed.data.description || "",
        status: "active",
        variantA: parsed.data.variantA,
        variantB: parsed.data.variantB,
        sampleSize: parsed.data.sampleSize,
        currentSamples: 0,
        startDate: new Date(),
      };
      abTests.set(id, newTest);
      res.status(201).json(newTest);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/rlhf/ab-tests", "create A/B test");
    }
  });

  app.get("/api/pre-auth/rlhf/ab-tests/:id/results", async (req, res) => {
    try {
      const test = abTests.get(req.params.id);
      if (!test) {
        return res.status(404).json({ error: "A/B test not found" });
      }
      res.json({
        id: test.id,
        name: test.name,
        status: test.status,
        sampleSize: test.sampleSize,
        currentSamples: test.currentSamples,
        results: test.results || {
          variantAAcceptance: 0,
          variantBAcceptance: 0,
          winner: null,
        },
      });
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/rlhf/ab-tests/:id/results", "fetch A/B test results");
    }
  });

  app.patch("/api/pre-auth/rlhf/ab-tests/:id", async (req, res) => {
    try {
      const test = abTests.get(req.params.id);
      if (!test) {
        return res.status(404).json({ error: "A/B test not found" });
      }
      const updateSchema = z.object({
        status: z.enum(["active", "completed", "paused"]).optional(),
        currentSamples: z.number().optional(),
        results: z.object({
          variantAAcceptance: z.number(),
          variantBAcceptance: z.number(),
          winner: z.string().optional(),
        }).optional(),
      });
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const updated: ABTest = {
        ...test,
        ...parsed.data,
        endDate: parsed.data.status === "completed" ? new Date() : test.endDate,
      };
      abTests.set(req.params.id, updated);
      res.json(updated);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/rlhf/ab-tests/:id", "update A/B test");
    }
  });

  // Batch Routes
  app.get("/api/pre-auth/batches", async (req, res) => {
    try {
      const batches = await storage.getPreAuthBatches();
      res.json(batches);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/batches", "fetch batches");
    }
  });

  app.post("/api/pre-auth/batches", async (req, res) => {
    try {
      const parsed = insertPreAuthBatchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const batch = await storage.createPreAuthBatch(parsed.data);
      res.status(201).json(batch);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/batches", "create batch");
    }
  });

  app.get("/api/pre-auth/batches/:id", async (req, res) => {
    try {
      const batch = await storage.getPreAuthBatch(req.params.id);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      res.json(batch);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/batches/:id", "fetch batch");
    }
  });

  app.patch("/api/pre-auth/batches/:id", async (req, res) => {
    try {
      const partialSchema = insertPreAuthBatchSchema.partial();
      const parsed = partialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const batch = await storage.updatePreAuthBatch(req.params.id, parsed.data);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      res.json(batch);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/batches/:id", "update batch");
    }
  });

  // Cognitive Agent Route
  app.post("/api/pre-auth/cognitive-agent", async (req, res) => {
    try {
      const { claimId, agentType } = req.body;
      if (!claimId) {
        return res.status(400).json({ error: "claimId is required" });
      }

      const { runPreAuthAgent } = await import("../services/agent-orchestrator");
      const claim = await storage.getPreAuthClaim(claimId) || await storage.getPreAuthClaimByClaimId(claimId);

      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }

      const result = await runPreAuthAgent(agentType || "regulatory_compliance", claim);
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "/api/pre-auth/cognitive-agent", "run cognitive agent");
    }
  });
}
