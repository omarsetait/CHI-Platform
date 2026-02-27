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

export const fraudReportSchema = z.object({
  reportType: z.enum(["billing_fraud", "identity_misuse", "phantom_services", "upcoding", "other"]),
  providerName: z.string().optional(),
  description: z.string().min(1),
  anonymous: z.boolean(),
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

export function buildMembersComplaintsResponse() {
  return {
    summary: {
      total: 14200,
      resolved: 11360,
      pending: 2130,
      escalated: 710,
      avgResolutionDays: 12.4,
    },
    byType: [
      { type: "Claim Denial Disputes", percent: 33.9, count: 4814 },
      { type: "Coverage Confusion", percent: 24.0, count: 3408 },
      { type: "Provider Billing Issues", percent: 18.0, count: 2556 },
      { type: "Pre-Authorization Delays", percent: 14.0, count: 1988 },
      { type: "Quality of Care", percent: 10.0, count: 1420 },
    ],
    topOffenders: [
      { entity: "MedGulf Insurance", complaints: 1840, resolutionRate: 72.3 },
      { entity: "Al Salam Hospital Group", complaints: 1260, resolutionRate: 68.1 },
      { entity: "National Care Clinics", complaints: 980, resolutionRate: 81.5 },
    ],
    trend: [
      { month: "Sep 2025", total: 2180, resolved: 1810 },
      { month: "Oct 2025", total: 2350, resolved: 1920 },
      { month: "Nov 2025", total: 2410, resolved: 1980 },
      { month: "Dec 2025", total: 2520, resolved: 2050 },
      { month: "Jan 2026", total: 2380, resolved: 1960 },
      { month: "Feb 2026", total: 2360, resolved: 1940 },
    ],
    generatedAt: new Date().toISOString(),
  };
}

export function buildMembersCoverageGapsResponse() {
  return {
    totalUninsured: 1850000,
    bySegment: [
      { segment: "Domestic Workers", count: 680000, risk: "critical" },
      { segment: "Gig Economy Workers", count: 520000, risk: "high" },
      { segment: "Expired Policies", count: 340000, risk: "high" },
      { segment: "Saudi Dependents", count: 210000, risk: "medium" },
      { segment: "Rural Areas", count: 100000, risk: "medium" },
    ],
    byRegion: [
      { region: "Riyadh", insured: 4200000, total: 4580000, gapPercent: 8.3 },
      { region: "Makkah", insured: 3100000, total: 3570000, gapPercent: 13.1 },
      { region: "Eastern", insured: 2400000, total: 2730000, gapPercent: 12.1 },
      { region: "Madinah", insured: 1100000, total: 1310000, gapPercent: 15.9 },
      { region: "Asir", insured: 700000, total: 935000, gapPercent: 25.2 },
    ],
    generatedAt: new Date().toISOString(),
  };
}

export function buildMembersProviderQualityResponse() {
  return {
    avgNationalRating: 4.0,
    avgWaitTime: 32,
    providers: [
      { name: "King Fahd Medical City", city: "Riyadh", rating: 4.8, waitTime: 15, satisfaction: 96, accredited: true },
      { name: "King Faisal Specialist Hospital", city: "Riyadh", rating: 4.7, waitTime: 20, satisfaction: 94, accredited: true },
      { name: "Saudi German Hospital", city: "Jeddah", rating: 4.3, waitTime: 25, satisfaction: 88, accredited: true },
      { name: "Dr. Sulaiman Al Habib", city: "Riyadh", rating: 4.1, waitTime: 30, satisfaction: 85, accredited: true },
      { name: "Dallah Hospital", city: "Riyadh", rating: 3.8, waitTime: 35, satisfaction: 79, accredited: true },
      { name: "Al Noor Specialist Hospital", city: "Makkah", rating: 3.5, waitTime: 45, satisfaction: 72, accredited: true },
      { name: "Jeddah Dental Center", city: "Jeddah", rating: 3.1, waitTime: 55, satisfaction: 61, accredited: false },
    ],
    generatedAt: new Date().toISOString(),
  };
}

export function buildMembersBenefitsAwarenessResponse() {
  return {
    categories: [
      {
        name: "Preventive Care",
        nameAr: "الرعاية الوقائية",
        services: [
          { service: "Annual Health Checkup", serviceAr: "الفحص الصحي السنوي", covered: true, limit: "1 visit per year" },
          { service: "Vaccinations (Adult Schedule)", serviceAr: "التطعيمات (جدول البالغين)", covered: true, limit: "As per MOH schedule" },
          { service: "Cancer Screening", serviceAr: "فحص السرطان", covered: true, limit: "Age-appropriate per CHI guidelines" },
        ],
      },
      {
        name: "Maternity",
        nameAr: "الأمومة",
        services: [
          { service: "Prenatal Visits", serviceAr: "زيارات ما قبل الولادة", covered: true, limit: "Up to 12 visits" },
          { service: "Delivery (Normal & C-Section)", serviceAr: "الولادة (طبيعية وقيصرية)", covered: true, limit: "Full coverage with network provider" },
          { service: "IVF Treatment", serviceAr: "علاج أطفال الأنابيب", covered: false, limit: "Not covered under standard plans" },
        ],
      },
      {
        name: "Emergency",
        nameAr: "الطوارئ",
        services: [
          { service: "ER Visit", serviceAr: "زيارة الطوارئ", covered: true, limit: "No limit for genuine emergencies" },
          { service: "Ambulance Transport", serviceAr: "نقل الإسعاف", covered: true, limit: "Within network coverage area" },
          { service: "Out-of-Network Emergency", serviceAr: "طوارئ خارج الشبكة", covered: true, limit: "Covered, subject to reimbursement" },
        ],
      },
      {
        name: "Mental Health",
        nameAr: "الصحة النفسية",
        services: [
          { service: "Psychiatric Consultation", serviceAr: "استشارة نفسية", covered: true, limit: "Up to 12 sessions per year" },
          { service: "Inpatient Mental Health", serviceAr: "العلاج النفسي الداخلي", covered: true, limit: "Up to 30 days per year" },
          { service: "Addiction Treatment", serviceAr: "علاج الإدمان", covered: false, limit: "Excluded from standard policies" },
        ],
      },
    ],
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

export function buildEmployerComplianceResponse() {
  return {
    summary: {
      totalEmployers: 48500,
      complianceRate: 85,
      violated: 2425,
      totalFinesYTD: 2500000,
    },
    bySector: [
      { sector: "Construction", complianceRate: 76, employers: 8200 },
      { sector: "Hospitality", complianceRate: 80, employers: 6100 },
      { sector: "Retail", complianceRate: 87, employers: 9400 },
      { sector: "Technology", complianceRate: 95, employers: 5800 },
      { sector: "Healthcare", complianceRate: 95, employers: 7200 },
      { sector: "Manufacturing", complianceRate: 88, employers: 11800 },
    ],
    recentViolations: [
      { employer: "Al-Nakheel Construction Co.", sector: "Construction", violation: "Failure to insure 120 workers", fineAmount: 180000, date: "2026-02-15" },
      { employer: "Gulf Hospitality Group", sector: "Hospitality", violation: "Expired policies for 85 employees", fineAmount: 127500, date: "2026-02-10" },
      { employer: "Riyadh Fresh Markets", sector: "Retail", violation: "Non-compliant plan tier for 45 staff", fineAmount: 67500, date: "2026-02-03" },
    ],
    generatedAt: new Date().toISOString(),
  };
}

export function buildInsurerHealthResponse() {
  return {
    insurers: [
      { name: "Bupa Arabia", premiums: 8200, claims: 6150, lossRatio: 75.0, capitalAdequacy: 185, marketShare: 22.4, trend: "stable" },
      { name: "Tawuniya", premiums: 7100, claims: 5680, lossRatio: 80.0, capitalAdequacy: 172, marketShare: 19.4, trend: "stable" },
      { name: "MedGulf", premiums: 4800, claims: 4320, lossRatio: 90.0, capitalAdequacy: 138, marketShare: 13.1, trend: "at_risk" },
      { name: "Al Rajhi Takaful", premiums: 3200, claims: 2400, lossRatio: 75.0, capitalAdequacy: 195, marketShare: 8.7, trend: "improving" },
      { name: "SAICO", premiums: 2100, claims: 1890, lossRatio: 90.0, capitalAdequacy: 142, marketShare: 5.7, trend: "declining" },
      { name: "Walaa", premiums: 1800, claims: 1260, lossRatio: 70.0, capitalAdequacy: 210, marketShare: 4.9, trend: "improving" },
    ],
    generatedAt: new Date().toISOString(),
  };
}

export function buildMarketConcentrationResponse() {
  return {
    herfindahlIndex: 1420,
    interpretation: "Moderately concentrated market — between 1,000 and 2,500 HHI threshold. Regulators should monitor top-3 insurers for anti-competitive pricing.",
    top5Share: 68.6,
    mergerScenarios: [
      {
        scenario: "Bupa Arabia + MedGulf merger",
        combinedShare: 35.5,
        resultingHHI: 1988,
        impact: "Would push market toward highly concentrated territory (HHI > 2,500 threshold approaching). CHI should impose premium-cap conditions.",
      },
      {
        scenario: "Tawuniya + Al Rajhi Takaful merger",
        combinedShare: 28.1,
        resultingHHI: 1757,
        impact: "Moderate increase in concentration. Acceptable with behavioral remedies — mandate continued Takaful product availability.",
      },
    ],
    historicalHHI: [
      { year: "2023", hhi: 1580 },
      { year: "2024", hhi: 1510 },
      { year: "2025", hhi: 1460 },
      { year: "2026", hhi: 1420 },
    ],
    generatedAt: new Date().toISOString(),
  };
}

export function buildCoverageExpansionResponse() {
  return {
    current: {
      covered: 11500000,
      target: 25000000,
      progress: 46,
    },
    segments: [
      { segment: "Private Sector Employees", covered: 8200000, target: 9000000, progress: 91 },
      { segment: "Saudi Dependents", covered: 2000000, target: 3000000, progress: 66 },
      { segment: "Domestic Workers", covered: 540000, target: 3000000, progress: 18 },
      { segment: "Gig Economy Workers", covered: 350000, target: 5000000, progress: 7 },
      { segment: "Visit Visa Holders", covered: 200000, target: 5000000, progress: 4 },
    ],
    premiumImpact: {
      currentAvgPremium: 4200,
      projectedWithExpansion: 3100,
      volumeDiscount: "26% reduction due to risk pool expansion",
    },
    generatedAt: new Date().toISOString(),
  };
}

export function buildCostContainmentResponse() {
  return {
    adminCostRatio: 18.7,
    oecdBenchmark: 12.0,
    savingsOpportunity: 2490000000,
    breakdown: [
      { category: "Claims Processing", percent: 32, amount: 4720000000 },
      { category: "Provider Network Mgmt", percent: 24, amount: 3540000000 },
      { category: "IT & Digital Infrastructure", percent: 19, amount: 2800000000 },
      { category: "Regulatory Compliance", percent: 15, amount: 2210000000 },
      { category: "Customer Service", percent: 10, amount: 1470000000 },
    ],
    costTrend: [
      { year: "2023", ratio: 22.1 },
      { year: "2024", ratio: 20.5 },
      { year: "2025", ratio: 19.4 },
      { year: "2026", ratio: 18.7 },
    ],
    generatedAt: new Date().toISOString(),
  };
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

  // --- Business Market Oversight Routes ---

  app.get("/api/business/employer-compliance", async (_req, res) => {
    try {
      res.json(buildEmployerComplianceResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/business/employer-compliance", "fetch employer compliance data");
    }
  });

  app.get("/api/business/insurer-health", async (_req, res) => {
    try {
      res.json(buildInsurerHealthResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/business/insurer-health", "fetch insurer health data");
    }
  });

  app.get("/api/business/market-concentration", async (_req, res) => {
    try {
      res.json(buildMarketConcentrationResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/business/market-concentration", "fetch market concentration data");
    }
  });

  app.get("/api/business/coverage-expansion", async (_req, res) => {
    try {
      res.json(buildCoverageExpansionResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/business/coverage-expansion", "fetch coverage expansion data");
    }
  });

  app.get("/api/business/cost-containment", async (_req, res) => {
    try {
      res.json(buildCostContainmentResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/business/cost-containment", "fetch cost containment data");
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

  // --- Members Beneficiary Services Routes ---

  app.get("/api/members/complaints", async (_req, res) => {
    try {
      res.json(buildMembersComplaintsResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/members/complaints", "fetch member complaints data");
    }
  });

  app.get("/api/members/coverage-gaps", async (_req, res) => {
    try {
      res.json(buildMembersCoverageGapsResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/members/coverage-gaps", "fetch coverage gaps data");
    }
  });

  app.get("/api/members/provider-quality", async (_req, res) => {
    try {
      res.json(buildMembersProviderQualityResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/members/provider-quality", "fetch provider quality data");
    }
  });

  app.get("/api/members/benefits-awareness", async (_req, res) => {
    try {
      res.json(buildMembersBenefitsAwarenessResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/members/benefits-awareness", "fetch benefits awareness data");
    }
  });

  app.post("/api/members/fraud-reports", async (req, res) => {
    try {
      const data = fraudReportSchema.parse(req.body);

      await createAuditLog({
        userId: req.user?.id,
        action: "MEMBER_FRAUD_REPORT_SUBMITTED",
        resourceType: "member_fraud_report",
        resourceId: data.providerName || "anonymous",
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get("User-Agent"),
        details: { ...data, description: data.anonymous ? "[REDACTED]" : data.description },
      });

      res.status(201).json({
        id: `fr-${Date.now()}`,
        trackingNumber: `FR-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
        status: "submitted",
        submittedAt: new Date().toISOString(),
        message: "Your fraud report has been submitted and routed to the Audit & FWA Investigation Unit for review.",
      });
    } catch (error) {
      handleRouteError(res, error, "/api/members/fraud-reports", "submit fraud report");
    }
  });
}
