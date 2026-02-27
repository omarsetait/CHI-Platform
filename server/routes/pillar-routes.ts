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

export function buildAccreditationScorecardsResponse() {
  return {
    summary: {
      totalProviders: 8,
      avgScore: 74.3,
      drgReadyCount: 3,
      highRiskCount: 2,
      avgRejectionRate: 12.8,
    },
    providers: [
      { id: "PRV-001", name: "Riyadh Care Hospital", city: "Riyadh", specialty: "Multi-specialty", overallScore: 92, codingAccuracy: 94, rejectionRate: 5.1, fwaFlags: 1, sbsCompliance: 88, drgReady: true, trend: "improving" },
      { id: "PRV-002", name: "Jeddah National Medical Center", city: "Jeddah", specialty: "Cardiology", overallScore: 85, codingAccuracy: 87, rejectionRate: 8.3, fwaFlags: 3, sbsCompliance: 79, drgReady: true, trend: "stable" },
      { id: "PRV-003", name: "Dammam General Hospital", city: "Dammam", specialty: "Orthopedics", overallScore: 78, codingAccuracy: 80, rejectionRate: 11.2, fwaFlags: 5, sbsCompliance: 72, drgReady: false, trend: "improving" },
      { id: "PRV-004", name: "Makkah Specialist Clinic", city: "Makkah", specialty: "Internal Medicine", overallScore: 71, codingAccuracy: 73, rejectionRate: 14.5, fwaFlags: 8, sbsCompliance: 65, drgReady: false, trend: "declining" },
      { id: "PRV-005", name: "Madinah Health Complex", city: "Madinah", specialty: "Pediatrics", overallScore: 65, codingAccuracy: 68, rejectionRate: 17.8, fwaFlags: 11, sbsCompliance: 55, drgReady: false, trend: "declining" },
      { id: "PRV-006", name: "Al Khobar Medical Tower", city: "Dammam", specialty: "Dermatology", overallScore: 80, codingAccuracy: 82, rejectionRate: 9.7, fwaFlags: 4, sbsCompliance: 76, drgReady: true, trend: "stable" },
      { id: "PRV-007", name: "Taif Regional Hospital", city: "Makkah", specialty: "General Surgery", overallScore: 68, codingAccuracy: 70, rejectionRate: 15.9, fwaFlags: 9, sbsCompliance: 60, drgReady: false, trend: "stable" },
      { id: "PRV-008", name: "Tabuk Care Center", city: "Riyadh", specialty: "Ophthalmology", overallScore: 55, codingAccuracy: 58, rejectionRate: 20.1, fwaFlags: 14, sbsCompliance: 45, drgReady: false, trend: "declining" },
    ],
    generatedAt: new Date().toISOString(),
  };
}

export function buildSbsComplianceResponse() {
  return {
    overallRate: 62,
    byRegion: [
      { region: "Riyadh", rate: 78, providers: 45 },
      { region: "Jeddah", rate: 65, providers: 38 },
      { region: "Dammam", rate: 71, providers: 28 },
      { region: "Makkah", rate: 52, providers: 22 },
      { region: "Madinah", rate: 48, providers: 18 },
    ],
    commonIssues: [
      { issue: "Incorrect modifier usage", count: 342, severity: "high" },
      { issue: "Missing pre-authorization codes", count: 287, severity: "high" },
      { issue: "Outdated ICD-10 mappings", count: 198, severity: "medium" },
      { issue: "Incomplete procedure documentation", count: 156, severity: "medium" },
      { issue: "Bundled services billed separately", count: 121, severity: "low" },
    ],
    trend: [
      { month: "Oct 2025", rate: 41 },
      { month: "Nov 2025", rate: 47 },
      { month: "Dec 2025", rate: 52 },
      { month: "Jan 2026", rate: 57 },
      { month: "Feb 2026", rate: 62 },
    ],
    generatedAt: new Date().toISOString(),
  };
}

export function buildDrgReadinessResponse() {
  return {
    overall: { ready: 38, inProgress: 34, notStarted: 28 },
    criteria: [
      { name: "Clinical Documentation Improvement", progress: 65 },
      { name: "Coder Training & Certification", progress: 48 },
      { name: "System Integration (Grouper)", progress: 32 },
      { name: "Cost Accounting Setup", progress: 25 },
      { name: "Quality Metrics Alignment", progress: 55 },
      { name: "Physician Engagement Program", progress: 40 },
    ],
    projectedTimeline: [
      { quarter: "Q1 2026", readiness: 38 },
      { quarter: "Q2 2026", readiness: 52 },
      { quarter: "Q3 2026", readiness: 68 },
      { quarter: "Q4 2026", readiness: 82 },
      { quarter: "Q1 2027", readiness: 95 },
    ],
    generatedAt: new Date().toISOString(),
  };
}

export function buildRejectionPatternsResponse() {
  return {
    overallRate: 15.2,
    bySpecialty: [
      { specialty: "Internal Medicine", rate: 18.4, claims: 4520 },
      { specialty: "Orthopedics", rate: 16.1, claims: 2890 },
      { specialty: "Cardiology", rate: 14.7, claims: 3200 },
      { specialty: "Pediatrics", rate: 12.3, claims: 2100 },
      { specialty: "Dermatology", rate: 10.8, claims: 1850 },
      { specialty: "Ophthalmology", rate: 9.5, claims: 1400 },
    ],
    byInsurer: [
      { insurer: "Bupa Arabia", rate: 12.1, claims: 5800 },
      { insurer: "Tawuniya", rate: 14.5, claims: 4900 },
      { insurer: "Medgulf", rate: 16.8, claims: 3200 },
      { insurer: "ACIG", rate: 18.2, claims: 2100 },
      { insurer: "Malath", rate: 15.4, claims: 1800 },
      { insurer: "Al Rajhi Takaful", rate: 13.7, claims: 1500 },
    ],
    byRegion: [
      { region: "Riyadh", rate: 11.2, claims: 6500 },
      { region: "Jeddah", rate: 14.8, claims: 4800 },
      { region: "Dammam", rate: 13.5, claims: 3200 },
      { region: "Makkah", rate: 18.1, claims: 2800 },
      { region: "Madinah", rate: 19.4, claims: 2000 },
    ],
    generatedAt: new Date().toISOString(),
  };
}

export function buildDocumentationQualityResponse() {
  return {
    overallIndex: 68,
    metrics: [
      { name: "Clinical Note Completeness", score: 72, benchmark: 85 },
      { name: "Diagnosis Specificity", score: 65, benchmark: 80 },
      { name: "Procedure Documentation", score: 70, benchmark: 82 },
      { name: "Medical Necessity Support", score: 58, benchmark: 78 },
      { name: "Discharge Summary Quality", score: 75, benchmark: 88 },
      { name: "Coding-Documentation Alignment", score: 68, benchmark: 85 },
    ],
    impact: {
      revenueAtRisk: 12500000,
      drgDowngrades: 342,
      preventableRejections: 1856,
    },
    generatedAt: new Date().toISOString(),
  };
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

  // --- Intelligence Provider Oversight Routes ---

  app.get("/api/intelligence/accreditation-scorecards", async (_req, res) => {
    try {
      res.json(buildAccreditationScorecardsResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/accreditation-scorecards", "fetch accreditation scorecards");
    }
  });

  app.get("/api/intelligence/sbs-compliance", async (_req, res) => {
    try {
      res.json(buildSbsComplianceResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/sbs-compliance", "fetch SBS compliance data");
    }
  });

  app.get("/api/intelligence/drg-readiness", async (_req, res) => {
    try {
      res.json(buildDrgReadinessResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/drg-readiness", "fetch DRG readiness data");
    }
  });

  app.get("/api/intelligence/rejection-patterns", async (_req, res) => {
    try {
      res.json(buildRejectionPatternsResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/rejection-patterns", "fetch rejection patterns");
    }
  });

  app.get("/api/intelligence/documentation-quality", async (_req, res) => {
    try {
      res.json(buildDocumentationQualityResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/documentation-quality", "fetch documentation quality data");
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
