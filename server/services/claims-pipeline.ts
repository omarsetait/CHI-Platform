import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  claimIngestItems,
  claimIngestBatches,
  claimPipelineEvents,
  fwaCases,
  preAuthClaims,
  type ClaimIngestItem,
  type InsertFwaCase,
  type InsertPreAuthClaim,
} from "@shared/schema";
import { demoProviders, getProviderById } from "./demo-data-seeder";

type PipelineStage = "intake" | "validation" | "risk_scoring" | "pattern_matching" | "decision_routing";
type PipelineDecision = "approved" | "fwa_flagged" | "preauth_required" | "escalated";

const HIGH_RISK_PROCEDURE_CODES = ["99215", "99223", "99285"];
const SURGERY_PREFIXES = ["27"];
const IMAGING_PREFIXES = ["70"];
const VACCINE_PREFIXES = ["90"];
const KNOWN_FRAUD_DIAGNOSIS_PATTERNS = ["Z76.5", "R69", "F99"];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomDelay(): number {
  return 1000 + Math.random() * 1000;
}

async function createPipelineEvent(
  itemId: string,
  batchId: string | null,
  stage: PipelineStage,
  status: "pending" | "processing" | "completed" | "failed",
  message: string,
  details?: {
    riskScore?: number;
    patternMatches?: string[];
    validationErrors?: string[];
    decision?: string;
    confidence?: number;
  },
  durationMs?: number
): Promise<void> {
  await db.insert(claimPipelineEvents).values({
    itemId,
    batchId,
    stage,
    status,
    message,
    details: details || null,
    durationMs: durationMs || null,
  } as typeof claimPipelineEvents.$inferInsert);
}

async function updateClaimItem(
  itemId: string,
  updates: Partial<{
    currentStage: PipelineStage | "completed";
    status: "pending" | "processing" | "completed" | "failed";
    riskScore: string;
    decision: PipelineDecision;
    decisionReason: string;
    createdEntityId: string;
    createdEntityType: string;
  }>
): Promise<void> {
  await db
    .update(claimIngestItems)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(claimIngestItems.id, itemId));
}

async function getClaimItem(itemId: string): Promise<ClaimIngestItem | undefined> {
  const [result] = await db.select().from(claimIngestItems).where(eq(claimIngestItems.id, itemId));
  return result;
}

async function getClaimItemsByBatchId(batchId: string): Promise<ClaimIngestItem[]> {
  const results = await db.select().from(claimIngestItems).where(eq(claimIngestItems.batchId, batchId));
  return results;
}

function isProviderFlagged(providerId: string): boolean {
  const provider = getProviderById(providerId);
  if (provider) {
    return provider.fwaCaseCount > 0 || parseFloat(provider.riskScore) > 70;
  }
  return false;
}

function getProviderRiskScore(providerId: string): number {
  const provider = getProviderById(providerId);
  if (provider) {
    return parseFloat(provider.riskScore);
  }
  return 0;
}

function hasProcedureCodePrefix(code: string | null | undefined, prefixes: string[]): boolean {
  if (!code) return false;
  return prefixes.some((prefix) => code.startsWith(prefix));
}

function isHighRiskProcedureCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return HIGH_RISK_PROCEDURE_CODES.includes(code);
}

function matchesFraudDiagnosisPattern(code: string | null | undefined): boolean {
  if (!code) return false;
  return KNOWN_FRAUD_DIAGNOSIS_PATTERNS.some(
    (pattern) => code.includes(pattern) || code.startsWith(pattern.split(".")[0])
  );
}

export function getScenarioFromClaim(claim: ClaimIngestItem): PipelineDecision {
  const amount = parseFloat(claim.amount?.toString() || "0");
  const procedureCode = claim.procedureCode;
  const diagnosisCode = claim.diagnosisCode;
  const providerId = claim.providerId;
  const providerRiskScore = getProviderRiskScore(providerId);

  if (providerRiskScore > 80) {
    return "escalated";
  }

  if (matchesFraudDiagnosisPattern(diagnosisCode)) {
    return "escalated";
  }

  if (amount > 25000) {
    return "fwa_flagged";
  }

  if (isHighRiskProcedureCode(procedureCode)) {
    return "fwa_flagged";
  }

  if (isProviderFlagged(providerId)) {
    return "fwa_flagged";
  }

  if (
    hasProcedureCodePrefix(procedureCode, SURGERY_PREFIXES) ||
    hasProcedureCodePrefix(procedureCode, IMAGING_PREFIXES) ||
    hasProcedureCodePrefix(procedureCode, VACCINE_PREFIXES)
  ) {
    return "preauth_required";
  }

  if (amount < 5000 && !isHighRiskProcedureCode(procedureCode)) {
    return "approved";
  }

  return "approved";
}

export async function calculateRiskScore(claim: ClaimIngestItem, providerId: string): Promise<number> {
  let score = 0;
  const amount = parseFloat(claim.amount?.toString() || "0");

  if (amount > 20000) {
    score += 30;
  } else if (amount > 10000) {
    score += 20;
  } else if (amount > 5000) {
    score += 10;
  }

  if (isHighRiskProcedureCode(claim.procedureCode)) {
    score += 25;
  }

  if (matchesFraudDiagnosisPattern(claim.diagnosisCode)) {
    score += 20;
  }

  const providerRiskScore = getProviderRiskScore(providerId);
  score += providerRiskScore * 0.3;

  if (isProviderFlagged(providerId)) {
    score += 15;
  }

  return Math.min(100, Math.round(score));
}

async function processIntakeStage(claim: ClaimIngestItem): Promise<{ success: boolean; errors: string[] }> {
  const startTime = Date.now();
  await delay(getRandomDelay());

  const errors: string[] = [];

  if (!claim.claimNumber) {
    errors.push("Missing claim number");
  }
  if (!claim.patientId) {
    errors.push("Missing patient ID");
  }
  if (!claim.providerId) {
    errors.push("Missing provider ID");
  }
  if (!claim.amount) {
    errors.push("Missing amount");
  }

  const duration = Date.now() - startTime;
  const success = errors.length === 0;

  await createPipelineEvent(
    claim.id,
    claim.batchId,
    "intake",
    success ? "completed" : "failed",
    success ? "Claim intake successful - basic structure validated" : `Intake failed: ${errors.join(", ")}`,
    success ? undefined : { validationErrors: errors },
    duration
  );

  return { success, errors };
}

async function processValidationStage(claim: ClaimIngestItem): Promise<{ success: boolean; errors: string[] }> {
  const startTime = Date.now();
  await delay(getRandomDelay());

  const errors: string[] = [];
  const amount = parseFloat(claim.amount?.toString() || "0");

  if (amount <= 0) {
    errors.push("Amount must be positive");
  }
  if (amount > 1000000) {
    errors.push("Amount exceeds maximum allowed");
  }
  if (claim.procedureCode && !/^[0-9A-Z]{3,7}$/.test(claim.procedureCode)) {
    errors.push("Invalid procedure code format");
  }
  if (claim.diagnosisCode && !/^[A-Z][0-9]{2}(\.[0-9]{1,4})?$/.test(claim.diagnosisCode)) {
    errors.push("Invalid diagnosis code format");
  }

  const duration = Date.now() - startTime;
  const success = errors.length === 0;

  await createPipelineEvent(
    claim.id,
    claim.batchId,
    "validation",
    success ? "completed" : "failed",
    success ? "Validation passed - all fields valid" : `Validation failed: ${errors.join(", ")}`,
    success ? undefined : { validationErrors: errors },
    duration
  );

  return { success, errors };
}

async function processRiskScoringStage(claim: ClaimIngestItem): Promise<{ success: boolean; riskScore: number }> {
  const startTime = Date.now();
  await delay(getRandomDelay());

  const riskScore = await calculateRiskScore(claim, claim.providerId);

  await updateClaimItem(claim.id, { riskScore: riskScore.toString() });

  const duration = Date.now() - startTime;

  await createPipelineEvent(
    claim.id,
    claim.batchId,
    "risk_scoring",
    "completed",
    `Risk score calculated: ${riskScore}/100`,
    { riskScore, confidence: 0.85 },
    duration
  );

  return { success: true, riskScore };
}

async function processPatternMatchingStage(claim: ClaimIngestItem): Promise<{ success: boolean; patterns: string[] }> {
  const startTime = Date.now();
  await delay(getRandomDelay());

  const patterns: string[] = [];
  const amount = parseFloat(claim.amount?.toString() || "0");

  if (isHighRiskProcedureCode(claim.procedureCode)) {
    patterns.push("HIGH_VALUE_PROCEDURE");
  }

  if (amount > 25000) {
    patterns.push("EXCESSIVE_AMOUNT");
  }

  if (isProviderFlagged(claim.providerId)) {
    patterns.push("PROVIDER_HISTORY_FLAG");
  }

  if (matchesFraudDiagnosisPattern(claim.diagnosisCode)) {
    patterns.push("KNOWN_FRAUD_DIAGNOSIS");
  }

  if (getProviderRiskScore(claim.providerId) > 80) {
    patterns.push("HIGH_RISK_PROVIDER");
  }

  const duration = Date.now() - startTime;

  await createPipelineEvent(
    claim.id,
    claim.batchId,
    "pattern_matching",
    "completed",
    patterns.length > 0 ? `Patterns detected: ${patterns.join(", ")}` : "No suspicious patterns detected",
    { patternMatches: patterns },
    duration
  );

  return { success: true, patterns };
}

async function processDecisionRoutingStage(claim: ClaimIngestItem): Promise<{ success: boolean; decision: PipelineDecision; reason: string }> {
  const startTime = Date.now();
  await delay(getRandomDelay());

  const decision = getScenarioFromClaim(claim);
  let reason = "";

  switch (decision) {
    case "approved":
      reason = "Claim meets all approval criteria - auto-approved";
      break;
    case "fwa_flagged":
      const amount = parseFloat(claim.amount?.toString() || "0");
      if (amount > 25000) {
        reason = "Flagged for FWA review - amount exceeds threshold ($25,000)";
      } else if (isHighRiskProcedureCode(claim.procedureCode)) {
        reason = `Flagged for FWA review - high-risk procedure code (${claim.procedureCode})`;
      } else {
        reason = "Flagged for FWA review - provider has prior FWA history";
      }
      break;
    case "preauth_required":
      if (hasProcedureCodePrefix(claim.procedureCode, SURGERY_PREFIXES)) {
        reason = "Pre-authorization required - surgical procedure detected";
      } else if (hasProcedureCodePrefix(claim.procedureCode, IMAGING_PREFIXES)) {
        reason = "Pre-authorization required - imaging procedure detected";
      } else {
        reason = "Pre-authorization required - vaccine/immunization procedure detected";
      }
      break;
    case "escalated":
      if (getProviderRiskScore(claim.providerId) > 80) {
        reason = "Escalated - provider has critical risk score (>80)";
      } else {
        reason = "Escalated - diagnosis code matches known fraud patterns";
      }
      break;
  }

  const duration = Date.now() - startTime;

  await createPipelineEvent(
    claim.id,
    claim.batchId,
    "decision_routing",
    "completed",
    `Decision: ${decision.toUpperCase()} - ${reason}`,
    { decision, confidence: 0.92 },
    duration
  );

  return { success: true, decision, reason };
}

async function createFwaCase(claim: ClaimIngestItem, reason: string): Promise<string> {
  const caseId = `FWA-PIPE-${Date.now()}`;
  const amount = parseFloat(claim.amount?.toString() || "0");

  const fwaCase: InsertFwaCase = {
    caseId,
    claimId: claim.claimNumber,
    providerId: claim.providerId,
    patientId: claim.patientId,
    status: "draft",
    phase: "a1_analysis",
    priority: amount > 50000 ? "critical" : amount > 25000 ? "high" : "medium",
    totalAmount: claim.amount?.toString() || "0",
    assignedTo: "FWA Pipeline Auto-Assignment",
  };

  const [result] = await db.insert(fwaCases).values(fwaCase).returning();
  return result.id;
}

async function createPreAuthClaim(claim: ClaimIngestItem, reason: string): Promise<string> {
  const preAuthClaimData: InsertPreAuthClaim = {
    claimId: `PA-PIPE-${Date.now()}`,
    payerId: "PAYER-001",
    memberId: claim.patientId,
    providerId: claim.providerId,
    totalAmount: claim.amount?.toString() || "0",
    diagnoses: claim.diagnosisCode
      ? [
          {
            code: claim.diagnosisCode,
            code_system: "ICD-10",
            desc: claim.description || "Pending diagnosis verification",
          },
        ]
      : [],
    lineItems: claim.procedureCode
      ? [
          {
            line_id: "1",
            code_type: "CPT",
            code: claim.procedureCode,
            desc: claim.description || "Procedure requiring pre-authorization",
            units: 1,
            net_amount: parseFloat(claim.amount?.toString() || "0"),
            service_date: claim.serviceDate || undefined,
          },
        ]
      : [],
    status: "ingested",
    processingPhase: 1,
    priority: "NORMAL",
  };

  const [result] = await db.insert(preAuthClaims).values(preAuthClaimData as typeof preAuthClaims.$inferInsert).returning();
  return result.id;
}

export async function processClaimItem(itemId: string): Promise<void> {
  const claim = await getClaimItem(itemId);
  if (!claim) {
    throw new Error(`Claim item not found: ${itemId}`);
  }

  await updateClaimItem(itemId, { status: "processing", currentStage: "intake" });

  const intakeResult = await processIntakeStage(claim);
  if (!intakeResult.success) {
    await updateClaimItem(itemId, { status: "failed", decisionReason: intakeResult.errors.join(", ") });
    return;
  }

  await updateClaimItem(itemId, { currentStage: "validation" });
  const validationResult = await processValidationStage(claim);
  if (!validationResult.success) {
    await updateClaimItem(itemId, { status: "failed", decisionReason: validationResult.errors.join(", ") });
    return;
  }

  await updateClaimItem(itemId, { currentStage: "risk_scoring" });
  await processRiskScoringStage(claim);

  await updateClaimItem(itemId, { currentStage: "pattern_matching" });
  await processPatternMatchingStage(claim);

  await updateClaimItem(itemId, { currentStage: "decision_routing" });
  const decisionResult = await processDecisionRoutingStage(claim);

  let createdEntityId: string | undefined;
  let createdEntityType: string | undefined;

  if (decisionResult.decision === "fwa_flagged") {
    createdEntityId = await createFwaCase(claim, decisionResult.reason);
    createdEntityType = "fwa_case";
  } else if (decisionResult.decision === "preauth_required") {
    createdEntityId = await createPreAuthClaim(claim, decisionResult.reason);
    createdEntityType = "preauth_claim";
  }

  await updateClaimItem(itemId, {
    currentStage: "completed",
    status: "completed",
    decision: decisionResult.decision,
    decisionReason: decisionResult.reason,
    createdEntityId,
    createdEntityType,
  });
}

export async function processBatch(batchId: string): Promise<void> {
  const [batch] = await db.select().from(claimIngestBatches).where(eq(claimIngestBatches.id, batchId));
  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  await db
    .update(claimIngestBatches)
    .set({ status: "processing" })
    .where(eq(claimIngestBatches.id, batchId));

  const claims = await getClaimItemsByBatchId(batchId);
  let processedCount = 0;

  for (const claim of claims) {
    try {
      await processClaimItem(claim.id);
      processedCount++;
      await db
        .update(claimIngestBatches)
        .set({ processedClaims: processedCount })
        .where(eq(claimIngestBatches.id, batchId));
    } catch (error) {
      console.error(`Error processing claim ${claim.id}:`, error);
    }
  }

  await db
    .update(claimIngestBatches)
    .set({
      status: "completed",
      processedClaims: processedCount,
      completedAt: new Date(),
    })
    .where(eq(claimIngestBatches.id, batchId));
}
