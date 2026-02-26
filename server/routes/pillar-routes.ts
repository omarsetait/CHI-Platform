import type { Express, Response } from "express";
import { z } from "zod";
import { createAuditLog } from "../middleware/audit";

interface RouteErrorHandler {
  (res: Response, error: unknown, routePath: string, operation?: string): void;
}

export const selfAuditSimulationSchema = z.object({
  providerId: z.string().min(1),
  providerName: z.string().min(1),
  claimCount: z.number().int().min(1).max(5000).default(100),
  source: z.enum(["manual_upload", "api"]).default("manual_upload"),
});

export const policySimulationSchema = z.object({
  employerId: z.string().min(1),
  copayPercent: z.number().min(0).max(50),
  pharmacyLimit: z.number().min(1000).max(10000),
  baselineAnnualSpend: z.number().positive(),
});

export const memberReportSchema = z.object({
  memberId: z.string().min(1),
  issueType: z.enum(["unrendered_service", "unnecessary_tests", "overcharged", "other"]),
  relatedClaimId: z.string().optional(),
  details: z.string().min(20),
});

export function buildIntelligenceSummaryResponse() {
  return {
    overallPerformance: 87.6,
    peerRankPercentile: 85,
    fwaSafetyScore: 95,
    rejectionRate: 4.2,
    trendDelta: 2.4,
    generatedAt: new Date().toISOString(),
  };
}

export function buildIntelligenceRejectionsResponse() {
  return [
    {
      id: "CLM-2023-8821",
      date: "2023-11-20",
      code: "E11.9",
      amount: 1250,
      reason: "Medical Necessity Not Met",
      aiDecoder: "Missing supporting labs for HbA1c > 8.0",
      recommendedAction: "Attach lab results",
    },
    {
      id: "CLM-2023-8845",
      date: "2023-11-21",
      code: "J01.90",
      amount: 450,
      reason: "Unbundling detected",
      aiDecoder: "Consultation billed separately from minor procedure on same day",
      recommendedAction: "Bundle codes",
    },
  ];
}

export function buildBusinessEmployerProfileResponse(id: string) {
  return {
    employerId: id,
    employerName: id === "acme" ? "Acme Corp" : "Enterprise Group",
    activeEmployees: 5204,
    ytdHealthcareSpend: 8400000,
    riskFactor: "elevated",
    potentialFwaLeakage: 850000,
    generatedAt: new Date().toISOString(),
  };
}

export function buildMembersHealthFeedResponse() {
  return [
    {
      id: "evt-001",
      date: "2026-02-20",
      type: "claim",
      title: "General Consultation",
      provider: "Riyadh Care Hospital",
      status: "Approved",
      copay: "50 SAR",
    },
    {
      id: "evt-002",
      date: "2026-02-12",
      type: "education",
      title: "Breast Cancer Screening Guidelines",
      status: "Recommended",
    },
  ];
}

export function registerPillarRoutes(app: Express, handleRouteError: RouteErrorHandler) {
  app.get("/api/intelligence/scorecards/summary", async (req, res) => {
    try {
      res.json(buildIntelligenceSummaryResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/scorecards/summary", "fetch intelligence scorecards summary");
    }
  });

  app.get("/api/intelligence/rejections", async (req, res) => {
    try {
      res.json(buildIntelligenceRejectionsResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/rejections", "fetch rejection decoder records");
    }
  });

  app.post("/api/intelligence/self-audit/simulations", async (req, res) => {
    try {
      const data = selfAuditSimulationSchema.parse(req.body);
      const simulatedRiskScore = Number((Math.random() * 40 + 50).toFixed(1));
      const flaggedClaims = Math.max(1, Math.round(data.claimCount * 0.04));

      await createAuditLog({
        userId: req.user?.id,
        action: "INTELLIGENCE_SELF_AUDIT_SIMULATION_CREATED",
        resourceType: "intelligence_self_audit",
        resourceId: data.providerId,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get("User-Agent"),
        details: data,
      });

      res.status(201).json({
        id: `sim-${Date.now()}`,
        providerId: data.providerId,
        providerName: data.providerName,
        claimCount: data.claimCount,
        source: data.source,
        riskScore: simulatedRiskScore,
        flaggedClaims,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/self-audit/simulations", "create self-audit simulation");
    }
  });

  app.get("/api/business/employers/:id/profile", async (req, res) => {
    try {
      const id = req.params.id;
      res.json(buildBusinessEmployerProfileResponse(id));
    } catch (error) {
      handleRouteError(res, error, "/api/business/employers/:id/profile", "fetch employer profile");
    }
  });

  app.post("/api/business/policy-simulations", async (req, res) => {
    try {
      const data = policySimulationSchema.parse(req.body);
      const copaySavings = (data.copayPercent - 20) * 0.005 * data.baselineAnnualSpend;
      const pharmacySavings = (5000 - data.pharmacyLimit) * 100;
      const totalSavings = Math.max(0, copaySavings + pharmacySavings);

      await createAuditLog({
        userId: req.user?.id,
        action: "BUSINESS_POLICY_SIMULATION_RUN",
        resourceType: "business_policy_simulation",
        resourceId: data.employerId,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get("User-Agent"),
        details: data,
      });

      res.status(201).json({
        employerId: data.employerId,
        baselineAnnualSpend: data.baselineAnnualSpend,
        simulatedAnnualSpend: Math.max(0, Number((data.baselineAnnualSpend - totalSavings).toFixed(2))),
        estimatedSavings: Number(totalSavings.toFixed(2)),
        assumptions: {
          copayPercent: data.copayPercent,
          pharmacyLimit: data.pharmacyLimit,
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleRouteError(res, error, "/api/business/policy-simulations", "run policy simulation");
    }
  });

  app.get("/api/members/me/health-feed", async (req, res) => {
    try {
      res.json(buildMembersHealthFeedResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/members/me/health-feed", "fetch member health feed");
    }
  });

  app.post("/api/members/reports", async (req, res) => {
    try {
      const data = memberReportSchema.parse(req.body);

      await createAuditLog({
        userId: req.user?.id,
        action: "MEMBER_ISSUE_REPORTED",
        resourceType: "member_report",
        resourceId: data.relatedClaimId || data.memberId,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get("User-Agent"),
        details: data,
      });

      res.status(201).json({
        id: `mbr-${Date.now()}`,
        trackingNumber: `RPT-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
        status: "submitted",
        submittedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleRouteError(res, error, "/api/members/reports", "submit member report");
    }
  });
}
