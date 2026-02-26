import { describe, it, expect, vi } from "vitest";

vi.mock("../middleware/audit", () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

import {
  buildBusinessEmployerProfileResponse,
  buildIntelligenceRejectionsResponse,
  buildIntelligenceSummaryResponse,
  buildMembersHealthFeedResponse,
  memberReportSchema,
  policySimulationSchema,
  selfAuditSimulationSchema,
} from "./pillar-routes";

describe("pillar contract routes", () => {
  it("returns intelligence scorecard summary shape", () => {
    const summary = buildIntelligenceSummaryResponse();

    expect(summary).toMatchObject({
      overallPerformance: expect.any(Number),
      peerRankPercentile: expect.any(Number),
      fwaSafetyScore: expect.any(Number),
      rejectionRate: expect.any(Number),
      trendDelta: expect.any(Number),
      generatedAt: expect.any(String),
    });
  });

  it("returns intelligence rejection decoder records shape", () => {
    const rows = buildIntelligenceRejectionsResponse();

    expect(Array.isArray(rows)).toBe(true);
    expect(rows[0]).toMatchObject({
      id: expect.any(String),
      code: expect.any(String),
      amount: expect.any(Number),
      recommendedAction: expect.any(String),
    });
  });

  it("returns business employer profile shape", () => {
    const profile = buildBusinessEmployerProfileResponse("acme");

    expect(profile).toMatchObject({
      employerId: "acme",
      employerName: expect.any(String),
      activeEmployees: expect.any(Number),
      ytdHealthcareSpend: expect.any(Number),
      potentialFwaLeakage: expect.any(Number),
    });
  });

  it("returns members health feed shape", () => {
    const feed = buildMembersHealthFeedResponse();

    expect(Array.isArray(feed)).toBe(true);
    expect(feed[0]).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      status: expect.any(String),
    });
  });

  it("validates self-audit simulation payload", () => {
    const parsed = selfAuditSimulationSchema.safeParse({
      providerId: "PRV-001",
      providerName: "Riyadh Care Hospital",
      claimCount: 120,
      source: "manual_upload",
    });

    expect(parsed.success).toBe(true);
  });

  it("validates policy simulation and member report payloads", () => {
    const policyParsed = policySimulationSchema.safeParse({
      employerId: "acme",
      copayPercent: 20,
      pharmacyLimit: 5000,
      baselineAnnualSpend: 16800000,
    });

    expect(policyParsed.success).toBe(true);

    const reportParsed = memberReportSchema.safeParse({
      memberId: "MBR-001",
      issueType: "overcharged",
      details: "The copay charged did not match my approved policy terms and prior estimate.",
    });

    expect(reportParsed.success).toBe(true);
  });
});
