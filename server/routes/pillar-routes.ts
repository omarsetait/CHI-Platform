import type { Express, Response } from "express";
import { z } from "zod";
import { createAuditLog } from "../middleware/audit";
import { db } from "../db";
import { eq, ilike, desc, and, avg, sum } from "drizzle-orm";
import {
  portalProviders,
  providerScorecards,
  providerRejections,
  providerDrgAssessments,
  portalEmployers,
  employerPolicies,
  workforceHealthProfiles,
  employerViolations,
  portalMembers,
  memberCoverage,
  memberComplaints,
  coverageLookups,
  portalRegions,
  portalInsurers,
} from "@shared/schema";

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

export async function buildAccreditationScorecardsResponse(dbConn: any) {
  const providers = await dbConn.select().from(portalProviders).orderBy(portalProviders.name);
  const allScorecards = await dbConn.select().from(providerScorecards).orderBy(desc(providerScorecards.month));

  // Find the latest month
  const latestMonth = allScorecards.length > 0 ? allScorecards[0].month : null;
  const latestScorecards = latestMonth
    ? allScorecards.filter((s: any) => s.month === latestMonth)
    : [];

  // Build a map of providerCode -> scorecard for the latest month
  const scorecardMap = latestScorecards.reduce((acc: Record<string, any>, s: any) => {
    acc[s.providerCode] = s;
    return acc;
  }, {} as Record<string, any>);

  // Join providers with their latest scorecard
  const providerRows = providers.map((p: any) => {
    const sc = scorecardMap[p.code];
    return {
      id: p.code,
      name: p.name,
      city: p.city,
      specialty: (p.specialties && p.specialties.length > 0) ? p.specialties[0] : p.type,
      overallScore: sc ? Number(sc.overallScore) : 0,
      codingAccuracy: sc ? Number(sc.codingAccuracy) : 0,
      rejectionRate: sc ? Number(sc.rejectionRate) : 0,
      fwaFlags: sc ? Math.round(Number(sc.fwaRisk)) : 0,
      sbsCompliance: sc ? Number(sc.sbsCompliance) : 0,
      drgReady: sc ? Number(sc.drgReadiness) >= 70 : false,
      trend: sc?.trend || "stable",
    };
  });

  const totalProviders = providerRows.length;
  const avgScore = totalProviders > 0
    ? Number((providerRows.reduce((s: number, p: any) => s + p.overallScore, 0) / totalProviders).toFixed(1))
    : 0;
  const drgReadyCount = providerRows.filter((p: any) => p.drgReady).length;
  const highRiskCount = providerRows.filter((p: any) => p.fwaFlags >= 70).length;
  const avgRejectionRate = totalProviders > 0
    ? Number((providerRows.reduce((s: number, p: any) => s + p.rejectionRate, 0) / totalProviders).toFixed(1))
    : 0;

  return {
    summary: { totalProviders, avgScore, drgReadyCount, highRiskCount, avgRejectionRate },
    providers: providerRows,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildSbsComplianceResponse(dbConn: any) {
  const providers = await dbConn.select().from(portalProviders);
  const allScorecards = await dbConn.select().from(providerScorecards).orderBy(providerScorecards.month);

  // Build provider region map
  const providerRegionMap = providers.reduce((acc: Record<string, string>, p: any) => {
    acc[p.code] = p.region;
    return acc;
  }, {} as Record<string, string>);

  // Find latest month
  const latestMonth = allScorecards.length > 0
    ? allScorecards[allScorecards.length - 1].month
    : null;
  const latestScorecards = latestMonth
    ? allScorecards.filter((s: any) => s.month === latestMonth)
    : [];

  // Overall SBS compliance rate (avg across latest month scorecards)
  const overallRate = latestScorecards.length > 0
    ? Number((latestScorecards.reduce((s: number, sc: any) => s + Number(sc.sbsCompliance), 0) / latestScorecards.length).toFixed(1))
    : 0;

  // By region: group latest scorecards by provider region
  const regionGroups = latestScorecards.reduce((acc: Record<string, number[]>, sc: any) => {
    const region = providerRegionMap[sc.providerCode] || "Unknown";
    if (!acc[region]) acc[region] = [];
    acc[region].push(Number(sc.sbsCompliance));
    return acc;
  }, {} as Record<string, number[]>);

  const byRegion = (Object.entries(regionGroups) as [string, number[]][]).map(([region, rates]) => ({
    region,
    rate: Number((rates.reduce((a: number, b: number) => a + b, 0) / rates.length).toFixed(1)),
    providers: rates.length,
  })).sort((a, b) => b.rate - a.rate);

  // Common issues: derive from actual compliance gaps
  const commonIssues: { issue: string; count: number; severity: string }[] = [];
  const belowFifty = latestScorecards.filter((sc: any) => Number(sc.sbsCompliance) < 50).length;
  const belowSeventy = latestScorecards.filter((sc: any) => Number(sc.sbsCompliance) < 70).length;

  if (belowFifty > 0) {
    commonIssues.push({ issue: "Incomplete coding documentation", count: belowFifty, severity: "high" });
  }
  if (belowSeventy > 0) {
    commonIssues.push({ issue: "Missing mandatory SBS fields", count: belowSeventy, severity: "medium" });
  }

  // Trend: group ALL scorecards by month, compute avg sbsCompliance per month
  const monthGroups = allScorecards.reduce((acc: Record<string, number[]>, sc: any) => {
    if (!acc[sc.month]) acc[sc.month] = [];
    acc[sc.month].push(Number(sc.sbsCompliance));
    return acc;
  }, {} as Record<string, number[]>);

  const trend = (Object.entries(monthGroups) as [string, number[]][])
    .map(([month, rates]) => ({
      month,
      rate: Number((rates.reduce((a: number, b: number) => a + b, 0) / rates.length).toFixed(1)),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    overallRate,
    byRegion,
    commonIssues,
    trend,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildDrgReadinessResponse(dbConn: any) {
  const assessments = await dbConn.select().from(providerDrgAssessments);

  const total = assessments.length;
  const completeCount = assessments.filter((a: any) => a.status === "complete").length;
  const inProgressCount = assessments.filter((a: any) => a.status === "in_progress").length;
  const notStartedCount = assessments.filter((a: any) => a.status === "not_started").length;

  const pctComplete = total > 0 ? Math.round((completeCount / total) * 100) : 0;
  const pctInProgress = total > 0 ? Math.round((inProgressCount / total) * 100) : 0;
  const pctNotStarted = total > 0 ? Math.round((notStartedCount / total) * 100) : 0;

  // Group by criteriaName, compute % complete across providers for each criterion
  const criteriaGroups = assessments.reduce((acc: Record<string, { complete: number; total: number }>, a: any) => {
    if (!acc[a.criteriaName]) acc[a.criteriaName] = { complete: 0, total: 0 };
    acc[a.criteriaName].total += 1;
    if (a.status === "complete") acc[a.criteriaName].complete += 1;
    return acc;
  }, {} as Record<string, { complete: number; total: number }>);

  const criteria = (Object.entries(criteriaGroups) as [string, { complete: number; total: number }][]).map(([name, stats]) => ({
    name,
    progress: Math.round((stats.complete / stats.total) * 100),
  }));

  // Projected timeline: 4 quarters starting from current, increasing by ~12% each
  const now = new Date();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const currentYear = now.getFullYear();
  const projectedTimeline: { quarter: string; readiness: number }[] = [];
  let readiness = pctComplete;
  for (let i = 0; i < 4; i++) {
    const q = ((currentQuarter - 1 + i) % 4) + 1;
    const y = currentYear + Math.floor((currentQuarter - 1 + i) / 4);
    projectedTimeline.push({ quarter: `Q${q} ${y}`, readiness: Math.min(100, readiness) });
    readiness += 12;
  }

  return {
    overall: { ready: pctComplete, inProgress: pctInProgress, notStarted: pctNotStarted },
    criteria,
    projectedTimeline,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildRejectionPatternsResponse(dbConn: any) {
  const rejections = await dbConn.select().from(providerRejections);
  const providers = await dbConn.select().from(portalProviders);

  // Build provider lookup map
  const providerMap = providers.reduce((acc: Record<string, any>, p: any) => {
    acc[p.code] = p;
    return acc;
  }, {} as Record<string, any>);

  const totalRejections = rejections.length;

  // Estimate overall rate: use rejection count relative to a reasonable claim volume estimate
  const estimatedTotalClaims = totalRejections > 0 ? Math.round(totalRejections / 0.15) : 1;
  const overallRate = totalRejections > 0
    ? Number(((totalRejections / estimatedTotalClaims) * 100).toFixed(1))
    : 0;

  // By specialty: group rejections by provider type
  const specialtyGroups = rejections.reduce((acc: Record<string, number>, r: any) => {
    const provider = providerMap[r.providerCode];
    const specialty = provider?.type || "Unknown";
    acc[specialty] = (acc[specialty] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const bySpecialty = (Object.entries(specialtyGroups) as [string, number][]).map(([specialty, count]) => {
    const estimatedClaims = Math.round(count / 0.15);
    return {
      specialty,
      rate: Number(((count / estimatedClaims) * 100).toFixed(1)),
      claims: estimatedClaims,
    };
  }).sort((a, b) => b.claims - a.claims);

  // By insurer: group by denialCategory as proxy
  const insurerGroups = rejections.reduce((acc: Record<string, number>, r: any) => {
    acc[r.denialCategory] = (acc[r.denialCategory] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byInsurer = (Object.entries(insurerGroups) as [string, number][]).map(([insurer, count]) => {
    const estimatedClaims = Math.round(count / 0.15);
    return {
      insurer,
      rate: Number(((count / estimatedClaims) * 100).toFixed(1)),
      claims: estimatedClaims,
    };
  }).sort((a, b) => b.claims - a.claims);

  // By region: group rejections by provider region
  const regionGroups = rejections.reduce((acc: Record<string, number>, r: any) => {
    const provider = providerMap[r.providerCode];
    const region = provider?.region || "Unknown";
    acc[region] = (acc[region] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byRegion = (Object.entries(regionGroups) as [string, number][]).map(([region, count]) => {
    const estimatedClaims = Math.round(count / 0.15);
    return {
      region,
      rate: Number(((count / estimatedClaims) * 100).toFixed(1)),
      claims: estimatedClaims,
    };
  }).sort((a, b) => b.claims - a.claims);

  return {
    overallRate,
    bySpecialty,
    byInsurer,
    byRegion,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildDocumentationQualityResponse(dbConn: any) {
  const allScorecards = await dbConn.select().from(providerScorecards).orderBy(desc(providerScorecards.month));
  const rejections = await dbConn.select().from(providerRejections);

  // Find latest month
  const latestMonth = allScorecards.length > 0 ? allScorecards[0].month : null;
  const latestScorecards = latestMonth
    ? allScorecards.filter((s: any) => s.month === latestMonth)
    : [];

  const count = latestScorecards.length;

  const avgDocQuality = count > 0
    ? Number((latestScorecards.reduce((s: number, sc: any) => s + Number(sc.documentationQuality), 0) / count).toFixed(1))
    : 0;
  const avgCodingAccuracy = count > 0
    ? Number((latestScorecards.reduce((s: number, sc: any) => s + Number(sc.codingAccuracy), 0) / count).toFixed(1))
    : 0;
  const avgSbsCompliance = count > 0
    ? Number((latestScorecards.reduce((s: number, sc: any) => s + Number(sc.sbsCompliance), 0) / count).toFixed(1))
    : 0;
  const avgDrgReadiness = count > 0
    ? Number((latestScorecards.reduce((s: number, sc: any) => s + Number(sc.drgReadiness), 0) / count).toFixed(1))
    : 0;

  // Derived scores: blend existing metrics for Referral Completeness & Discharge Summary Quality
  const referralCompleteness = count > 0
    ? Number((avgDocQuality * 0.6 + avgSbsCompliance * 0.4).toFixed(1))
    : 0;
  const dischargeSummaryQuality = count > 0
    ? Number((avgDocQuality * 0.7 + avgCodingAccuracy * 0.3).toFixed(1))
    : 0;

  // Impact metrics
  const revenueAtRisk = rejections.reduce((sum: number, r: any) => sum + Number(r.amountSar), 0);
  const drgDowngrades = latestScorecards.filter((sc: any) => Number(sc.drgReadiness) < 50).length;

  // Preventable rejections: count rejections in categories that suggest preventable issues
  const preventableCategories = ["documentation", "coding", "authorization", "bundling", "medical necessity"];
  const preventableRejections = rejections.filter((r: any) =>
    preventableCategories.some(cat => r.denialCategory.toLowerCase().includes(cat))
  ).length;

  return {
    overallIndex: avgDocQuality,
    metrics: [
      { name: "Clinical Note Completeness", score: avgDocQuality, benchmark: 85 },
      { name: "Coding Accuracy", score: avgCodingAccuracy, benchmark: 90 },
      { name: "SBS Field Compliance", score: avgSbsCompliance, benchmark: 80 },
      { name: "DRG Documentation", score: avgDrgReadiness, benchmark: 75 },
      { name: "Referral Completeness", score: referralCompleteness, benchmark: 82 },
      { name: "Discharge Summary Quality", score: dischargeSummaryQuality, benchmark: 88 },
    ],
    impact: {
      revenueAtRisk: Math.round(revenueAtRisk),
      drgDowngrades,
      preventableRejections,
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

export async function buildMembersComplaintsResponse() {
  const allComplaints = await db.select().from(memberComplaints);

  const total = allComplaints.length;
  const resolved = allComplaints.filter(
    (c) => c.status === "closed" || c.status === "resolution",
  ).length;
  const pending = allComplaints.filter(
    (c) => c.status === "submitted" || c.status === "under_review",
  ).length;
  const escalated = allComplaints.filter(
    (c) => c.status === "investigation",
  ).length;

  // Compute average resolution days for closed complaints
  const closedWithDates = allComplaints.filter(
    (c) => c.status === "closed" && c.submittedAt && c.resolvedAt,
  );
  let avgResolutionDays = 0;
  if (closedWithDates.length > 0) {
    const totalDays = closedWithDates.reduce((sum, c) => {
      const diff =
        new Date(c.resolvedAt!).getTime() - new Date(c.submittedAt).getTime();
      return sum + diff / (1000 * 60 * 60 * 24);
    }, 0);
    avgResolutionDays =
      Math.round((totalDays / closedWithDates.length) * 10) / 10;
  }

  // Group by type
  const typeCounts: Record<string, number> = {};
  for (const c of allComplaints) {
    typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
  }
  const byType = Object.entries(typeCounts)
    .map(([type, count]) => ({
      type,
      percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Top offenders — group by type as entity proxy
  const topOffenders = Object.entries(typeCounts)
    .map(([type, count]) => {
      const typeComplaints = allComplaints.filter((c) => c.type === type);
      const typeResolved = typeComplaints.filter(
        (c) => c.status === "closed" || c.status === "resolution",
      ).length;
      return {
        entity: type,
        complaints: count,
        resolutionRate:
          count > 0 ? Math.round((typeResolved / count) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.complaints - a.complaints);

  // Trend — group by month from submittedAt, last 6 months
  const monthMap: Record<string, { total: number; resolved: number }> = {};
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  for (const c of allComplaints) {
    if (!c.submittedAt) continue;
    const d = new Date(c.submittedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap[key]) monthMap[key] = { total: 0, resolved: 0 };
    monthMap[key].total += 1;
    if (c.status === "closed" || c.status === "resolution") {
      monthMap[key].resolved += 1;
    }
  }
  const sortedMonths = Object.keys(monthMap).sort();
  const last6 = sortedMonths.slice(-6);
  const trend = last6.map((key) => {
    const [year, monthNum] = key.split("-");
    const label = `${monthNames[parseInt(monthNum, 10) - 1]} ${year}`;
    return {
      month: label,
      total: monthMap[key].total,
      resolved: monthMap[key].resolved,
    };
  });

  return {
    summary: { total, resolved, pending, escalated, avgResolutionDays },
    byType,
    topOffenders,
    trend,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildMembersCoverageGapsResponse() {
  const regions = await db.select().from(portalRegions);

  const totalPopulation = regions.reduce(
    (sum, r) => sum + (r.population || 0),
    0,
  );
  const totalInsured = regions.reduce(
    (sum, r) => sum + (r.insuredCount || 0),
    0,
  );
  const totalUninsured = totalPopulation - totalInsured;

  const bySegment = regions
    .map((r) => {
      const pop = r.population || 0;
      const insured = r.insuredCount || 0;
      const gap = pop - insured;
      const gapPercent = pop > 0 ? (gap / pop) * 100 : 0;
      let risk: string;
      if (gapPercent > 50) risk = "critical";
      else if (gapPercent > 30) risk = "high";
      else if (gapPercent > 15) risk = "medium";
      else risk = "low";
      return { segment: r.name, count: gap, risk };
    })
    .sort((a, b) => b.count - a.count);

  const byRegion = regions.map((r) => {
    const pop = r.population || 0;
    const insured = r.insuredCount || 0;
    const gapPercent = pop > 0 ? Math.round(((pop - insured) / pop) * 100 * 10) / 10 : 0;
    return {
      region: r.name,
      insured,
      total: pop,
      gapPercent,
    };
  });

  return {
    totalUninsured,
    bySegment,
    byRegion,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildMembersProviderQualityResponse() {
  const allProviders = await db.select().from(portalProviders);

  const ratings = allProviders
    .map((p) => Number(p.rating || 0))
    .filter((r) => r > 0);
  const waitTimes = allProviders
    .map((p) => p.avgWaitMinutes || 0)
    .filter((w) => w > 0);

  const avgNationalRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
      : 0;
  const avgWaitTime =
    waitTimes.length > 0
      ? Math.round(waitTimes.reduce((s, w) => s + w, 0) / waitTimes.length)
      : 0;

  const providers = allProviders
    .map((p) => {
      const rating = Number(p.rating || 0);
      return {
        name: p.name,
        city: p.city,
        rating,
        waitTime: p.avgWaitMinutes || 0,
        satisfaction: Math.round((rating / 5) * 100),
        accredited: p.accreditationStatus === "accredited",
      };
    })
    .sort((a, b) => b.rating - a.rating);

  return {
    avgNationalRating,
    avgWaitTime,
    providers,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildMembersBenefitsAwarenessResponse() {
  const allCoverage = await db.select().from(memberCoverage);

  // Group by benefitCategory
  const categoryMap: Record<
    string,
    {
      nameAr: string | null;
      services: {
        service: string;
        serviceAr: string | null;
        covered: boolean;
        limit: string;
      }[];
    }
  > = {};

  for (const row of allCoverage) {
    const catName = row.benefitCategory;
    if (!categoryMap[catName]) {
      categoryMap[catName] = {
        nameAr: row.benefitCategoryAr || null,
        services: [],
      };
    }

    const statusDesc =
      row.status === "covered"
        ? "Covered"
        : row.status === "partial"
          ? "Partially Covered"
          : "Not Covered";

    categoryMap[catName].services.push({
      service: `${catName} - ${statusDesc}`,
      serviceAr: row.benefitCategoryAr || null,
      covered: row.status === "covered" || row.status === "partial",
      limit: row.limitSar
        ? `Up to ${row.limitSar} SAR`
        : row.note || "Subject to policy terms",
    });
  }

  const categories = Object.entries(categoryMap).map(([name, data]) => ({
    name,
    nameAr: data.nameAr,
    services: data.services,
  }));

  return {
    categories,
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

export async function buildEmployerComplianceResponse() {
  const employers = await db.select().from(portalEmployers);
  const violations = await db.select().from(employerViolations);

  // Unresolved violations = those with no resolvedDate
  const unresolvedViolations = violations.filter((v) => !v.resolvedDate);
  const violatedCodes = new Set(unresolvedViolations.map((v) => v.employerCode));

  const totalEmployers = employers.length;
  const violated = employers.filter((e) => violatedCodes.has(e.code)).length;
  const compliant = totalEmployers - violated;
  const complianceRate =
    totalEmployers > 0 ? Math.round((compliant / totalEmployers) * 100) : 0;
  const totalFinesYTD = violations.reduce(
    (s, v) => s + Number(v.fineAmountSar || 0),
    0,
  );

  // Group by sector
  const sectorMap: Record<string, { total: number; compliant: number }> = {};
  for (const emp of employers) {
    const sec = emp.sector;
    if (!sectorMap[sec]) sectorMap[sec] = { total: 0, compliant: 0 };
    sectorMap[sec].total++;
    if (!violatedCodes.has(emp.code)) sectorMap[sec].compliant++;
  }
  const bySector = Object.entries(sectorMap).map(([sector, data]) => ({
    sector,
    complianceRate:
      data.total > 0
        ? Math.round((data.compliant / data.total) * 100)
        : 0,
    employers: data.total,
  }));

  // Build employer lookup by code for recent violations
  const employerByCode: Record<string, (typeof employers)[0]> = {};
  for (const emp of employers) employerByCode[emp.code] = emp;

  // Latest 5 violations ordered by issuedDate desc
  const sorted = [...violations].sort(
    (a, b) =>
      new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime(),
  );
  const recentViolations = sorted.slice(0, 5).map((v) => ({
    employer: employerByCode[v.employerCode]?.name ?? v.employerCode,
    sector: employerByCode[v.employerCode]?.sector ?? "Unknown",
    violation: v.violationType,
    fineAmount: Number(v.fineAmountSar || 0),
    date:
      v.issuedDate instanceof Date
        ? v.issuedDate.toISOString().slice(0, 10)
        : String(v.issuedDate),
  }));

  return {
    summary: { totalEmployers, complianceRate, violated, totalFinesYTD },
    bySector,
    recentViolations,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildInsurerHealthResponse() {
  const rows = await db.select().from(portalInsurers);

  const insurers = rows.map((r) => {
    const premiums = Number(r.premiumVolumeSar || 0) / 1_000_000;
    const lossRatio = Number(r.lossRatio || 0);
    const capitalAdequacy = Number(r.capitalAdequacy || 0);
    const claims = (premiums * lossRatio) / 100;
    const marketShare = Number(r.marketShare || 0);

    let trend: string;
    if (capitalAdequacy > 180) trend = "improving";
    else if (capitalAdequacy > 150) trend = "stable";
    else if (capitalAdequacy > 120) trend = "declining";
    else trend = "at_risk";

    return {
      name: r.name,
      premiums: Math.round(premiums * 100) / 100,
      claims: Math.round(claims * 100) / 100,
      lossRatio,
      capitalAdequacy,
      marketShare,
      trend,
    };
  });

  return {
    insurers,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildMarketConcentrationResponse() {
  const rows = await db.select().from(portalInsurers);

  const shares = rows.map((r) => ({
    name: r.name,
    share: Number(r.marketShare || 0),
  }));

  // HHI = sum of (marketShare)^2 * 100
  const herfindahlIndex =
    Math.round(shares.reduce((s, r) => s + r.share * r.share, 0) * 100) / 100;

  let interpretation: string;
  if (herfindahlIndex > 2500) {
    interpretation =
      "Highly concentrated market \u2014 HHI exceeds 2,500. Significant anti-competitive risk; CHI should consider structural remedies.";
  } else if (herfindahlIndex > 1500) {
    interpretation =
      "Moderately concentrated market \u2014 HHI between 1,500 and 2,500. Regulators should monitor top insurers for anti-competitive pricing.";
  } else {
    interpretation =
      "Competitive market \u2014 HHI below 1,500. Market structure supports healthy competition among insurers.";
  }

  // Top 5 share
  const sortedByShare = [...shares].sort((a, b) => b.share - a.share);
  const top5Share =
    Math.round(
      sortedByShare.slice(0, 5).reduce((s, r) => s + r.share, 0) * 100,
    ) / 100;

  // Merger scenarios: combine pairs of top insurers and compute resulting HHI
  const mergerScenarios: Array<{
    scenario: string;
    combinedShare: number;
    resultingHHI: number;
    impact: string;
  }> = [];
  const pairs: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [1, 2],
  ];
  for (const [i, j] of pairs) {
    if (!sortedByShare[i] || !sortedByShare[j]) continue;
    const a = sortedByShare[i];
    const b = sortedByShare[j];
    const combinedShare = Math.round((a.share + b.share) * 100) / 100;

    // Resulting HHI: remove both individual shares, add combined
    const resultingHHI =
      Math.round(
        (herfindahlIndex -
          a.share * a.share -
          b.share * b.share +
          combinedShare * combinedShare) *
          100,
      ) / 100;

    let impact: string;
    if (resultingHHI > 2500) {
      impact = `Would push market into highly concentrated territory (HHI ${Math.round(resultingHHI)}). CHI should impose premium-cap conditions.`;
    } else if (resultingHHI > 1500) {
      impact = `Moderate increase in concentration (HHI ${Math.round(resultingHHI)}). Acceptable with behavioral remedies.`;
    } else {
      impact = `Market remains competitive (HHI ${Math.round(resultingHHI)}). Low regulatory concern.`;
    }

    mergerScenarios.push({
      scenario: `${a.name} + ${b.name} merger`,
      combinedShare,
      resultingHHI: Math.round(resultingHHI),
      impact,
    });
  }

  // Historical HHI: synthetic 5 years trending toward current HHI
  const currentYear = new Date().getFullYear();
  const historicalHHI: Array<{ year: string; hhi: number }> = [];
  for (let y = currentYear - 4; y <= currentYear; y++) {
    const yearsAgo = currentYear - y;
    // Drift from slightly higher HHI in the past toward current
    const drift = yearsAgo * (herfindahlIndex * 0.03);
    historicalHHI.push({
      year: String(y),
      hhi: Math.round(herfindahlIndex + drift),
    });
  }

  return {
    herfindahlIndex: Math.round(herfindahlIndex),
    interpretation,
    top5Share,
    mergerScenarios,
    historicalHHI,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildCoverageExpansionResponse() {
  const regions = await db.select().from(portalRegions);

  const totalInsured = regions.reduce((s, r) => s + (r.insuredCount || 0), 0);
  const totalPopulation = regions.reduce((s, r) => s + (r.population || 0), 0);
  const progress =
    totalPopulation > 0
      ? Math.round((totalInsured / totalPopulation) * 100)
      : 0;

  const segments = regions.map((r) => ({
    segment: r.name,
    covered: r.insuredCount || 0,
    target: r.population || 0,
    progress:
      (r.population || 0) > 0
        ? Math.round(((r.insuredCount || 0) / (r.population || 1)) * 100)
        : 0,
  }));

  // Compute currentAvgPremium from employerPolicies
  const [premiumResult] = await db
    .select({ avgPremium: avg(employerPolicies.premiumPerEmployee) })
    .from(employerPolicies);
  const currentAvgPremium = Math.round(
    Number(premiumResult?.avgPremium || 0),
  );
  const projectedWithExpansion = Math.round(currentAvgPremium * 0.74);

  return {
    current: { covered: totalInsured, target: totalPopulation, progress },
    segments,
    premiumImpact: {
      currentAvgPremium,
      projectedWithExpansion,
      volumeDiscount: "26% reduction due to risk pool expansion",
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function buildCostContainmentResponse() {
  const [premiumResult] = await db
    .select({ totalPremium: sum(employerPolicies.totalAnnualPremium) })
    .from(employerPolicies);
  const totalPremium = Number(premiumResult?.totalPremium || 0);

  const adminCostRatio = 18;
  const oecdBenchmark = 12.0;
  const savingsOpportunity = Math.round(
    (totalPremium * (adminCostRatio - oecdBenchmark)) / 100,
  );

  // Distribute total premium across standard cost categories
  const categories = [
    { category: "Claims Processing", percent: 32 },
    { category: "Admin & Overhead", percent: 28 },
    { category: "IT Systems", percent: 18 },
    { category: "Compliance", percent: 12 },
    { category: "Other", percent: 10 },
  ];
  const breakdown = categories.map((c) => ({
    category: c.category,
    percent: c.percent,
    amount: Math.round((totalPremium * c.percent) / 100),
  }));

  // Synthetic 5-year cost trend trending down to current adminCostRatio
  const currentYear = new Date().getFullYear();
  const costTrend: Array<{ year: string; ratio: number }> = [];
  for (let y = currentYear - 4; y <= currentYear; y++) {
    const yearsAgo = currentYear - y;
    const ratio = Math.round((adminCostRatio + yearsAgo * 1.1) * 10) / 10;
    costTrend.push({ year: String(y), ratio });
  }

  return {
    adminCostRatio,
    oecdBenchmark,
    savingsOpportunity,
    breakdown,
    costTrend,
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
      res.json(await buildAccreditationScorecardsResponse(db));
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/accreditation-scorecards", "fetch accreditation scorecards");
    }
  });

  app.get("/api/intelligence/sbs-compliance", async (_req, res) => {
    try {
      res.json(await buildSbsComplianceResponse(db));
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/sbs-compliance", "fetch SBS compliance data");
    }
  });

  app.get("/api/intelligence/drg-readiness", async (_req, res) => {
    try {
      res.json(await buildDrgReadinessResponse(db));
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/drg-readiness", "fetch DRG readiness data");
    }
  });

  app.get("/api/intelligence/rejection-patterns", async (_req, res) => {
    try {
      res.json(await buildRejectionPatternsResponse(db));
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/rejection-patterns", "fetch rejection patterns");
    }
  });

  app.get("/api/intelligence/documentation-quality", async (_req, res) => {
    try {
      res.json(await buildDocumentationQualityResponse(db));
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/documentation-quality", "fetch documentation quality data");
    }
  });

  // --- Business Market Oversight Routes ---

  app.get("/api/business/employer-compliance", async (_req, res) => {
    try {
      res.json(await buildEmployerComplianceResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/business/employer-compliance", "fetch employer compliance data");
    }
  });

  app.get("/api/business/insurer-health", async (_req, res) => {
    try {
      res.json(await buildInsurerHealthResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/business/insurer-health", "fetch insurer health data");
    }
  });

  app.get("/api/business/market-concentration", async (_req, res) => {
    try {
      res.json(await buildMarketConcentrationResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/business/market-concentration", "fetch market concentration data");
    }
  });

  app.get("/api/business/coverage-expansion", async (_req, res) => {
    try {
      res.json(await buildCoverageExpansionResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/business/coverage-expansion", "fetch coverage expansion data");
    }
  });

  app.get("/api/business/cost-containment", async (_req, res) => {
    try {
      res.json(await buildCostContainmentResponse());
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
      res.json(await buildMembersComplaintsResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/members/complaints", "fetch member complaints data");
    }
  });

  app.get("/api/members/coverage-gaps", async (_req, res) => {
    try {
      res.json(await buildMembersCoverageGapsResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/members/coverage-gaps", "fetch coverage gaps data");
    }
  });

  app.get("/api/members/provider-quality", async (_req, res) => {
    try {
      res.json(await buildMembersProviderQualityResponse());
    } catch (error) {
      handleRouteError(res, error, "/api/members/provider-quality", "fetch provider quality data");
    }
  });

  app.get("/api/members/benefits-awareness", async (_req, res) => {
    try {
      res.json(await buildMembersBenefitsAwarenessResponse());
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

  // ── Intelligence Portal Routes ────────────────────────────────

  // GET /api/intelligence/portal/providers — list all providers for selector
  app.get("/api/intelligence/portal/providers", async (_req, res) => {
    try {
      const providers = await db.select({
        code: portalProviders.code,
        name: portalProviders.name,
        nameAr: portalProviders.nameAr,
        city: portalProviders.city,
        type: portalProviders.type,
        region: portalProviders.region,
      }).from(portalProviders).orderBy(portalProviders.name);
      res.json({ data: providers, generatedAt: new Date().toISOString() });
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/portal/providers", "list providers");
    }
  });

  // GET /api/intelligence/portal/provider/:code — full provider profile + latest scorecard
  app.get("/api/intelligence/portal/provider/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const provider = await db.select().from(portalProviders).where(eq(portalProviders.code, code)).limit(1);
      if (!provider.length) return res.status(404).json({ error: "Provider not found" });

      const scorecards = await db.select().from(providerScorecards)
        .where(eq(providerScorecards.providerCode, code))
        .orderBy(providerScorecards.month);

      const latestScorecard = scorecards[scorecards.length - 1];

      res.json({
        provider: provider[0],
        currentScorecard: latestScorecard,
        scorecardHistory: scorecards,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/portal/provider/:code", "fetch provider profile");
    }
  });

  // GET /api/intelligence/portal/provider/:code/rejections — rejection analysis
  app.get("/api/intelligence/portal/provider/:code/rejections", async (req, res) => {
    try {
      const { code } = req.params;
      const rejections = await db.select().from(providerRejections)
        .where(eq(providerRejections.providerCode, code))
        .orderBy(providerRejections.denialDate);

      const total = rejections.length;
      const byCategory = rejections.reduce((acc, r) => {
        acc[r.denialCategory] = (acc[r.denialCategory] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const categoryBreakdown = Object.entries(byCategory).map(([category, count]) => ({
        category,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
      })).sort((a, b) => b.count - a.count);

      const totalAmount = rejections.reduce((sum, r) => sum + Number(r.amountSar), 0);

      res.json({
        totalRejections: total,
        totalAmountSar: totalAmount,
        categoryBreakdown,
        rejections,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/portal/provider/:code/rejections", "fetch rejections");
    }
  });

  // GET /api/intelligence/portal/provider/:code/drg — DRG readiness
  app.get("/api/intelligence/portal/provider/:code/drg", async (req, res) => {
    try {
      const { code } = req.params;
      const assessments = await db.select().from(providerDrgAssessments)
        .where(eq(providerDrgAssessments.providerCode, code))
        .orderBy(providerDrgAssessments.sortOrder);

      const complete = assessments.filter(a => a.status === "complete").length;
      const total = assessments.length;

      res.json({
        completionRate: total > 0 ? Math.round((complete / total) * 100) : 0,
        completeCount: complete,
        totalCriteria: total,
        assessments,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/portal/provider/:code/drg", "fetch DRG readiness");
    }
  });

  // ── Business Portal Routes ────────────────────────────────────

  // GET /api/business/portal/employers — list for selector
  app.get("/api/business/portal/employers", async (_req, res) => {
    try {
      const employers = await db.select({
        code: portalEmployers.code,
        name: portalEmployers.name,
        nameAr: portalEmployers.nameAr,
        sector: portalEmployers.sector,
        city: portalEmployers.city,
        employeeCount: portalEmployers.employeeCount,
        complianceStatus: portalEmployers.complianceStatus,
      }).from(portalEmployers).orderBy(portalEmployers.name);
      res.json({ data: employers, generatedAt: new Date().toISOString() });
    } catch (error) {
      handleRouteError(res, error, "/api/business/portal/employers", "list employers");
    }
  });

  // GET /api/business/portal/employer/:code — employer profile + policy + compliance
  app.get("/api/business/portal/employer/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const employer = await db.select().from(portalEmployers).where(eq(portalEmployers.code, code)).limit(1);
      if (!employer.length) return res.status(404).json({ error: "Employer not found" });

      const policies = await db.select().from(employerPolicies)
        .where(eq(employerPolicies.employerCode, code));

      const violations = await db.select().from(employerViolations)
        .where(eq(employerViolations.employerCode, code))
        .orderBy(desc(employerViolations.issuedDate));

      const totalPremium = policies.reduce((sum, p) => sum + Number(p.totalAnnualPremium || 0), 0);
      const totalDependents = policies.reduce((sum, p) => sum + (p.dependentsCount || 0), 0);
      const nearestRenewal = policies.reduce((min, p) => {
        const days = p.renewalDaysRemaining || 999;
        return days < min ? days : min;
      }, 999);

      res.json({
        employer: employer[0],
        policies,
        violations,
        summary: {
          totalAnnualPremium: totalPremium,
          totalDependents,
          nearestRenewalDays: nearestRenewal < 999 ? nearestRenewal : null,
          openViolations: violations.filter(v => v.status !== "resolved").length,
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleRouteError(res, error, "/api/business/portal/employer/:code", "fetch employer profile");
    }
  });

  // GET /api/business/portal/employer/:code/health — workforce health profile
  app.get("/api/business/portal/employer/:code/health", async (req, res) => {
    try {
      const { code } = req.params;
      const profile = await db.select().from(workforceHealthProfiles)
        .where(eq(workforceHealthProfiles.employerCode, code)).limit(1);
      if (!profile.length) return res.status(404).json({ error: "Health profile not found" });

      res.json({
        ...profile[0],
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleRouteError(res, error, "/api/business/portal/employer/:code/health", "fetch workforce health");
    }
  });

  // GET /api/business/portal/employer/:code/costs — cost intelligence with plan comparison
  app.get("/api/business/portal/employer/:code/costs", async (req, res) => {
    try {
      const { code } = req.params;
      const policies = await db.select().from(employerPolicies)
        .where(eq(employerPolicies.employerCode, code));
      if (!policies.length) return res.status(404).json({ error: "No policies found" });

      const healthProfile = await db.select().from(workforceHealthProfiles)
        .where(eq(workforceHealthProfiles.employerCode, code)).limit(1);

      const currentPolicy = policies[0];
      const currentPremium = Number(currentPolicy.premiumPerEmployee);

      // Generate alternative plan comparisons
      const alternatives = [
        { tier: "Bronze", premium: Math.round(currentPremium * 0.7), savings: Math.round(currentPremium * 0.3), tradeoff: "Higher copay (30%), limited specialist network" },
        { tier: "Silver", premium: Math.round(currentPremium * 0.85), savings: Math.round(currentPremium * 0.15), tradeoff: "Moderate copay (20%), standard network" },
        { tier: "Gold", premium: currentPremium, savings: 0, tradeoff: "Current plan — low copay (10%), full network" },
        { tier: "Platinum", premium: Math.round(currentPremium * 1.25), savings: -Math.round(currentPremium * 0.25), tradeoff: "Zero copay, VIP network, wellness programs included" },
      ];

      res.json({
        currentPolicy,
        costPerEmployee: healthProfile[0]?.costPerEmployee || null,
        totalAnnualSpend: healthProfile[0]?.totalAnnualSpendSar || null,
        costTrend: healthProfile[0]?.costTrendPercent || null,
        alternatives,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleRouteError(res, error, "/api/business/portal/employer/:code/costs", "fetch cost intelligence");
    }
  });

  // ── Members Portal Routes ─────────────────────────────────────

  // GET /api/members/portal/members — list for selector
  app.get("/api/members/portal/members", async (_req, res) => {
    try {
      const members = await db.select({
        code: portalMembers.code,
        name: portalMembers.name,
        nameAr: portalMembers.nameAr,
        planTier: portalMembers.planTier,
        city: portalMembers.city,
        insurerName: portalMembers.insurerName,
      }).from(portalMembers).orderBy(portalMembers.name);
      res.json({ data: members, generatedAt: new Date().toISOString() });
    } catch (error) {
      handleRouteError(res, error, "/api/members/portal/members", "list members");
    }
  });

  // GET /api/members/portal/member/:code — member profile
  app.get("/api/members/portal/member/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const member = await db.select().from(portalMembers).where(eq(portalMembers.code, code)).limit(1);
      if (!member.length) return res.status(404).json({ error: "Member not found" });

      res.json({
        member: member[0],
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleRouteError(res, error, "/api/members/portal/member/:code", "fetch member profile");
    }
  });

  // GET /api/members/portal/member/:code/coverage — coverage details
  app.get("/api/members/portal/member/:code/coverage", async (req, res) => {
    try {
      const { code } = req.params;
      const coverage = await db.select().from(memberCoverage)
        .where(eq(memberCoverage.memberCode, code))
        .orderBy(memberCoverage.sortOrder);

      const totalLimit = coverage.reduce((sum, c) => sum + Number(c.limitSar || 0), 0);
      const totalUsed = coverage.reduce((sum, c) => sum + Number(c.usedSar || 0), 0);

      res.json({
        totalLimit,
        totalUsed,
        utilizationPercent: totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0,
        categories: coverage,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleRouteError(res, error, "/api/members/portal/member/:code/coverage", "fetch coverage");
    }
  });

  // GET /api/members/portal/member/:code/complaints — complaint history
  app.get("/api/members/portal/member/:code/complaints", async (req, res) => {
    try {
      const { code } = req.params;
      const complaints = await db.select().from(memberComplaints)
        .where(eq(memberComplaints.memberCode, code))
        .orderBy(desc(memberComplaints.submittedAt));

      res.json({
        total: complaints.length,
        open: complaints.filter(c => c.status !== "closed").length,
        complaints,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleRouteError(res, error, "/api/members/portal/member/:code/complaints", "fetch complaints");
    }
  });

  // GET /api/members/portal/coverage-lookup — "Is X covered?" search
  app.get("/api/members/portal/coverage-lookup", async (req, res) => {
    try {
      const q = (req.query.q as string) || "";
      const planTier = req.query.planTier as string;

      let query = db.select().from(coverageLookups);
      const conditions = [];

      if (q) {
        conditions.push(ilike(coverageLookups.question, `%${q}%`));
      }

      const results = conditions.length > 0
        ? await query.where(and(...conditions))
        : await query;

      // Filter by planTier in application layer (empty array = universal, include those too)
      const filtered = planTier
        ? results.filter(r => (r.planTiers || []).length === 0 || r.planTiers!.includes(planTier))
        : results;

      res.json({ data: filtered, generatedAt: new Date().toISOString() });
    } catch (error) {
      handleRouteError(res, error, "/api/members/portal/coverage-lookup", "coverage lookup");
    }
  });

  // GET /api/members/portal/providers — provider directory search
  app.get("/api/members/portal/providers", async (req, res) => {
    try {
      const { specialty, city, insurer, sortBy } = req.query;

      let results = await db.select().from(portalProviders);

      // Filter in application layer for flexibility
      if (specialty) {
        results = results.filter(p =>
          (p.specialties || []).some(s => s.toLowerCase().includes((specialty as string).toLowerCase()))
        );
      }
      if (city) {
        results = results.filter(p => p.city.toLowerCase() === (city as string).toLowerCase());
      }
      if (insurer) {
        const insurerLower = (insurer as string).toLowerCase();
        const codeToName: Record<string, string> = {
          "INS-001": "bupa arabia", "INS-002": "tawuniya", "INS-003": "medgulf",
          "INS-004": "al rajhi takaful", "INS-005": "saico", "INS-006": "walaa insurance",
        };
        results = results.filter(p =>
          (p.acceptedInsurers || []).some(code => {
            if (code.toLowerCase().includes(insurerLower)) return true;
            const name = codeToName[code];
            return name ? name.includes(insurerLower) : false;
          })
        );
      }

      // Sort
      if (sortBy === "rating") {
        results.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
      } else if (sortBy === "wait") {
        results.sort((a, b) => (a.avgWaitMinutes || 999) - (b.avgWaitMinutes || 999));
      } else {
        results.sort((a, b) => a.name.localeCompare(b.name));
      }

      res.json({ data: results, generatedAt: new Date().toISOString() });
    } catch (error) {
      handleRouteError(res, error, "/api/members/portal/providers", "search providers");
    }
  });
}
