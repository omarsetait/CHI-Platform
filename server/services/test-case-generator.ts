import OpenAI from "openai";
import { sql } from "drizzle-orm";
import { db } from "../db";
import {
  providers,
  members,
  practitioners,
  fwaRulesLibrary,
  cptEmbeddings,
  icd10Embeddings,
  type FwaIngestJob,
} from "@shared/schema";
import { createGenerationJob } from "./fwa-ingest-pipeline";
import { withRetry } from "../utils/openai-utils";

// =============================================================================
// PUBLIC TYPES
// =============================================================================

export type GenerationMode = "single" | "batch" | "wizard";
export type ScenarioType = "clean" | "suspicious" | "fraudulent";
export type SeverityType = "low" | "medium" | "high" | "mixed";

export interface SingleParams {
  scenario?: ScenarioType;
  scenarioType?: string;
}

export interface BatchParams {
  count?: number;
}

export interface WizardParams {
  count: number;
  severity: SeverityType;
  scenario?: ScenarioType;
  targetEntity?: { type: "provider" | "member" | "practitioner"; id: string };
  codeMix?: { icdCodes?: string[]; cptCodes?: string[] };
}

export type GenerateRequest =
  | { mode: "single"; params?: SingleParams }
  | { mode: "batch"; params?: BatchParams }
  | { mode: "wizard"; params: WizardParams };

export interface GeneratedClaimRow {
  claimNumber: string;
  memberId: string;
  providerId: string;
  practitionerId?: string | null;
  claimType: string;
  serviceDate: string;
  amount: number;
  primaryDiagnosis: string;
  icdCodes: string[];
  cptCodes: string[];
  description: string;
  specialty?: string | null;
  city?: string | null;
  providerType?: string | null;
  lengthOfStay?: number | null;
  quantity?: number | null;
  isPreAuthorized?: boolean;
}

// =============================================================================
// CONSTANTS — fallback grounding when DB samples are empty
// =============================================================================

const FALLBACK_ICD = ["I10", "E11.9", "J18.9", "M54.5", "K21.0", "F32.9", "G43.909", "J06.9", "Z23"];
const FALLBACK_CPT = ["99213", "99214", "99215", "99232", "99283", "99284", "99285", "36415", "80053", "93000"];
const CLAIM_TYPES = ["outpatient", "inpatient", "emergency", "surgery", "pharmacy", "lab", "radiology"];

// =============================================================================
// GROUNDING — pull real entries from the live DB so generated claims look
// believable and link to entities the 5 engines already know about.
// =============================================================================

interface GroundingPool {
  providers: Array<{ id: string; specialty: string | null; providerType: string; city: string | null; npi: string | null }>;
  members: Array<{ id: string }>;
  practitioners: Array<{ id: string; specialty: string }>;
  rules: Array<{ ruleCode: string; name: string; description: string; category: string; severity: string }>;
  cpt: Array<{ code: string; descriptor: string | null }>;
  icd: Array<{ code: string; description: string | null; chapterDescription: string | null }>;
}

async function buildGroundingPool(targetEntity?: WizardParams["targetEntity"]): Promise<GroundingPool> {
  // Pull modest samples — the LLM only needs enough variety to ground its
  // output, not the entire directory. ORDER BY RANDOM() keeps each call
  // varied without us having to manage cursors.
  const [provRows, memRows, pracRows, ruleRows, cptRows, icdRows] = await Promise.all([
    db
      .select({
        id: providers.id,
        specialty: providers.specialty,
        providerType: providers.providerType,
        city: providers.city,
        npi: providers.npi,
      })
      .from(providers)
      .orderBy(sql`random()`)
      .limit(20),
    db.select({ id: members.id }).from(members).orderBy(sql`random()`).limit(40),
    db
      .select({ id: practitioners.id, specialty: practitioners.specialty })
      .from(practitioners)
      .orderBy(sql`random()`)
      .limit(20),
    db
      .select({
        ruleCode: fwaRulesLibrary.ruleCode,
        name: fwaRulesLibrary.name,
        description: fwaRulesLibrary.description,
        category: sql<string>`${fwaRulesLibrary.category}::text`,
        severity: sql<string>`${fwaRulesLibrary.severity}::text`,
      })
      .from(fwaRulesLibrary)
      .where(sql`${fwaRulesLibrary.isActive} = true`)
      .orderBy(sql`random()`)
      .limit(15),
    db
      .select({ code: cptEmbeddings.code, descriptor: cptEmbeddings.cptLongDescriptor })
      .from(cptEmbeddings)
      .orderBy(sql`random()`)
      .limit(40),
    db
      .select({
        code: icd10Embeddings.code,
        description: icd10Embeddings.description,
        chapterDescription: icd10Embeddings.chapterDescription,
      })
      .from(icd10Embeddings)
      .orderBy(sql`random()`)
      .limit(40),
  ]);

  // If a wizard caller pinned a specific target entity, make sure it's in
  // the pool so the LLM is guaranteed to use it.
  if (targetEntity?.type === "provider") {
    const [p] = await db
      .select({
        id: providers.id,
        specialty: providers.specialty,
        providerType: providers.providerType,
        city: providers.city,
        npi: providers.npi,
      })
      .from(providers)
      .where(sql`${providers.id} = ${targetEntity.id}`)
      .limit(1);
    if (p && !provRows.some((r) => r.id === p.id)) provRows.unshift(p);
  } else if (targetEntity?.type === "member") {
    const [m] = await db.select({ id: members.id }).from(members).where(sql`${members.id} = ${targetEntity.id}`).limit(1);
    if (m && !memRows.some((r) => r.id === m.id)) memRows.unshift(m);
  } else if (targetEntity?.type === "practitioner") {
    const [d] = await db
      .select({ id: practitioners.id, specialty: practitioners.specialty })
      .from(practitioners)
      .where(sql`${practitioners.id} = ${targetEntity.id}`)
      .limit(1);
    if (d && !pracRows.some((r) => r.id === d.id)) pracRows.unshift(d);
  }

  return {
    providers: provRows.map((p) => ({
      id: p.id,
      specialty: p.specialty,
      providerType: p.providerType,
      city: p.city,
      npi: p.npi ?? null,
    })),
    members: memRows,
    practitioners: pracRows,
    rules: ruleRows,
    cpt: cptRows.map((c) => ({ code: c.code, descriptor: c.descriptor ?? null })),
    icd: icdRows.map((i) => ({
      code: i.code,
      description: i.description ?? null,
      chapterDescription: i.chapterDescription ?? null,
    })),
  };
}

// =============================================================================
// MODE → PLAN
// Translate the public request into a concrete generation plan: how many
// rows, how to mix scenarios, and what severity envelope to target.
// =============================================================================

interface GenerationPlan {
  count: number;
  scenarioMix: ScenarioType[]; // length === count
  severity: SeverityType;
  scenarioHint?: string;
  targetEntity?: WizardParams["targetEntity"];
  codeMix?: WizardParams["codeMix"];
}

function pickScenario(): ScenarioType {
  // 50% suspicious, 30% fraudulent, 20% clean — biased so generated batches
  // are useful for stress-testing the engines rather than dominated by clean
  // pass-throughs that produce nothing for investigators to look at.
  const r = Math.random();
  if (r < 0.5) return "suspicious";
  if (r < 0.8) return "fraudulent";
  return "clean";
}

function planFromRequest(req: GenerateRequest): GenerationPlan {
  if (req.mode === "single") {
    const scenario = req.params?.scenario ?? "suspicious";
    return {
      count: 1,
      scenarioMix: [scenario],
      severity: scenario === "fraudulent" ? "high" : scenario === "clean" ? "low" : "medium",
      scenarioHint: req.params?.scenarioType,
    };
  }
  if (req.mode === "batch") {
    // Task contract: small batch (5–10 mixed). The Zod schema enforces this
    // range too, but we clamp here as a defense-in-depth in case this is
    // called from somewhere else.
    const requested = req.params?.count;
    const count = requested && requested >= 5 ? Math.min(requested, 10) : 5 + Math.floor(Math.random() * 6);
    const scenarioMix: ScenarioType[] = Array.from({ length: count }, () => pickScenario());
    return { count, scenarioMix, severity: "mixed" };
  }
  // wizard — severity drives both the prompt envelope and the deterministic
  // fallback scenario distribution, so a "high" wizard run lands mostly on
  // fraudulent claims even when the LLM is unavailable.
  const p = req.params;
  const count = Math.max(1, Math.min(p.count, 100));
  const scenarioMix: ScenarioType[] = Array.from({ length: count }, () =>
    p.scenario ?? scenarioForSeverity(p.severity)
  );
  return {
    count,
    scenarioMix,
    severity: p.severity,
    targetEntity: p.targetEntity,
    codeMix: p.codeMix,
  };
}

// Severity → scenario mapping used when the wizard caller didn't pin a
// scenario. This makes the deterministic fallback honor `severity` instead
// of treating it as advisory prompt text only.
function scenarioForSeverity(sev: SeverityType): ScenarioType {
  const r = Math.random();
  switch (sev) {
    case "low":
      // mostly clean, occasional suspicious
      return r < 0.85 ? "clean" : "suspicious";
    case "medium":
      // mostly suspicious, some clean, occasional fraudulent
      if (r < 0.7) return "suspicious";
      if (r < 0.9) return "clean";
      return "fraudulent";
    case "high":
      // mostly fraudulent, some suspicious
      return r < 0.8 ? "fraudulent" : "suspicious";
    case "mixed":
    default:
      return pickScenario();
  }
}

// =============================================================================
// LLM-GROUNDED GENERATION
// =============================================================================

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

function buildLlmPrompt(plan: GenerationPlan, pool: GroundingPool): string {
  const summarizeRule = (r: GroundingPool["rules"][number]) =>
    `${r.ruleCode} [${r.category}/${r.severity}] ${r.name} — ${r.description.slice(0, 140)}`;
  const summarizeCpt = (c: GroundingPool["cpt"][number]) =>
    `${c.code} — ${(c.descriptor ?? "").slice(0, 80)}`;
  const summarizeIcd = (i: GroundingPool["icd"][number]) =>
    `${i.code} — ${(i.description ?? "").slice(0, 60)} (${i.chapterDescription ?? ""})`;

  const providerLines = pool.providers.map((p) => `${p.id} | ${p.specialty ?? "Unknown"} | ${p.providerType} | ${p.city ?? ""}`);
  const memberLines = pool.members.map((m) => m.id);
  const practitionerLines = pool.practitioners.map((d) => `${d.id} | ${d.specialty}`);

  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 90);

  const targetClause = plan.targetEntity
    ? `\nMANDATORY: every claim MUST use ${plan.targetEntity.type}Id="${plan.targetEntity.id}".`
    : "";
  const codeMixClause = plan.codeMix
    ? `\nMANDATORY code mix: prefer ICD codes from [${(plan.codeMix.icdCodes || []).join(", ")}] and CPT codes from [${(plan.codeMix.cptCodes || []).join(", ")}].`
    : "";
  const scenarioHint = plan.scenarioHint ? `\nScenario hint: ${plan.scenarioHint}.` : "";

  return `You generate realistic synthetic healthcare claims for fraud-detection testing.

GENERATE EXACTLY ${plan.count} CLAIMS, one per item in the scenarioMix array below.
For each claim, produce data in canonical schema (claimNumber, memberId, providerId, practitionerId, claimType, serviceDate, amount, primaryDiagnosis, icdCodes, cptCodes, description, specialty, city, providerType, lengthOfStay, isPreAuthorized).

Scenario mix (one entry per claim): ${JSON.stringify(plan.scenarioMix)}
Severity envelope: ${plan.severity}${scenarioHint}${targetClause}${codeMixClause}

GROUND IN THESE REAL ENTITIES (use only ids that appear here):
Providers (id | specialty | type | city):
${providerLines.join("\n")}

Members:
${memberLines.join(", ")}

Practitioners (id | specialty):
${practitionerLines.join("\n")}

GROUND IN THESE REAL CODES (use only codes that appear here, unless codeMix overrides):
ICD-10:
${pool.icd.map(summarizeIcd).join("\n")}

CPT:
${pool.cpt.map(summarizeCpt).join("\n")}

GROUND FRAUD CLAIMS IN THESE FWA RULES (the description field MUST hint at the rule pattern for fraudulent/suspicious claims):
${pool.rules.map(summarizeRule).join("\n")}

Per-scenario behavior:
- "clean": realistic vanilla claim. Amount 200–8000 SAR. Codes consistent with specialty. No fraud indicators.
- "suspicious": one or two soft anomalies (slightly above-peer amount, mild specialty/CPT mismatch, unusual frequency). Amount 5,000–40,000 SAR.
- "fraudulent": clearly maps to one of the FWA rules above. Amount 20,000–500,000 SAR. Description must reference the fraud pattern (e.g. "[FWA: ${pool.rules[0]?.ruleCode || "UC-101"}] ...").

Field constraints:
- claimNumber: must be unique within this batch, format "CLM-GEN-{TIMESTAMP}-{SEQ}".
- claimType: one of inpatient, outpatient, emergency, surgery, pharmacy, lab, radiology.
- serviceDate: ISO date between ${start.toISOString().slice(0, 10)} and ${today.toISOString().slice(0, 10)}.
- amount: positive number in SAR.
- primaryDiagnosis: a single ICD-10 code from the pool.
- icdCodes: 1–4 ICD-10 codes including primaryDiagnosis.
- cptCodes: 1–4 CPT codes from the pool.
- isPreAuthorized: boolean; fraudulent claims should usually be false.
- lengthOfStay: integer days for inpatient/surgery, otherwise null.

Return ONLY this JSON:
{ "claims": [ { "claimNumber": "...", ... }, ... ] }`;
}

async function generateWithLlm(plan: GenerationPlan, pool: GroundingPool): Promise<GeneratedClaimRow[]> {
  const client = getOpenAIClient();
  if (!client) throw new Error("LLM not configured");
  const model = process.env.AI_INTEGRATIONS_OPENAI_MODEL || "gpt-4o";
  const prompt = buildLlmPrompt(plan, pool);

  const resp = await withRetry(
    () =>
      client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a healthcare data expert that generates realistic synthetic medical claims. Always return valid JSON in the exact schema requested.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4096,
      }),
    { maxRetries: 2, timeoutMs: 60_000 }
  );

  const text = resp.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(text) as { claims?: unknown[] };
  if (!Array.isArray(parsed.claims)) throw new Error("LLM response missing claims array");
  return parsed.claims.map((c, idx) => coerceClaim(c, plan, pool, idx));
}

// =============================================================================
// DETERMINISTIC FALLBACK — used when no LLM is available or LLM fails. Still
// pulls from the same grounding pool so generated claims reference real
// providers/members/codes and look believable to the engines.
// =============================================================================

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fallbackGenerate(plan: GenerationPlan, pool: GroundingPool): GeneratedClaimRow[] {
  const t0 = Date.now().toString(36).toUpperCase();
  const out: GeneratedClaimRow[] = [];
  const cptCodes = pool.cpt.length > 0 ? pool.cpt.map((c) => c.code) : FALLBACK_CPT;
  const icdCodes = pool.icd.length > 0 ? pool.icd.map((i) => i.code) : FALLBACK_ICD;

  for (let i = 0; i < plan.count; i++) {
    const scenario = plan.scenarioMix[i];
    const provider = plan.targetEntity?.type === "provider"
      ? pool.providers.find((p) => p.id === plan.targetEntity!.id) || pool.providers[0]
      : pool.providers.length > 0 ? pickRandom(pool.providers) : null;
    const member = plan.targetEntity?.type === "member"
      ? pool.members.find((m) => m.id === plan.targetEntity!.id) || pool.members[0]
      : pool.members.length > 0 ? pickRandom(pool.members) : null;
    const practitioner = plan.targetEntity?.type === "practitioner"
      ? pool.practitioners.find((d) => d.id === plan.targetEntity!.id) || pool.practitioners[0]
      : pool.practitioners.length > 0 ? pickRandom(pool.practitioners) : null;

    if (!provider || !member) {
      throw new Error(
        "Cannot generate test claims: provider or member directory is empty. Seed providers/members first."
      );
    }

    const allowedCpt = plan.codeMix?.cptCodes && plan.codeMix.cptCodes.length > 0 ? plan.codeMix.cptCodes : cptCodes;
    const allowedIcd = plan.codeMix?.icdCodes && plan.codeMix.icdCodes.length > 0 ? plan.codeMix.icdCodes : icdCodes;
    const primary = pickRandom(allowedIcd);
    const icd = Array.from(new Set([primary, pickRandom(allowedIcd)]));
    const cpt = Array.from(new Set([pickRandom(allowedCpt), pickRandom(allowedCpt)]));

    let amount: number;
    let claimType: string;
    let description: string;
    let isPreAuthorized = true;

    if (scenario === "fraudulent") {
      const rule = pool.rules.length > 0 ? pickRandom(pool.rules) : null;
      amount = Math.round((20_000 + Math.random() * 480_000) * 100) / 100;
      claimType = pickRandom(["inpatient", "surgery", "emergency"]);
      description = rule
        ? `[FWA: ${rule.ruleCode}] ${rule.name} — ${rule.description.slice(0, 120)}`
        : `[FWA: SUSPECTED] high-value ${claimType} claim with anomalous billing`;
      isPreAuthorized = false;
    } else if (scenario === "suspicious") {
      amount = Math.round((5_000 + Math.random() * 35_000) * 100) / 100;
      claimType = pickRandom(["outpatient", "emergency", "lab", "radiology"]);
      description = `Possibly anomalous ${claimType} claim with above-peer amount and mild specialty mismatch`;
      isPreAuthorized = Math.random() > 0.4;
    } else {
      amount = Math.round((200 + Math.random() * 7_800) * 100) / 100;
      claimType = pickRandom(["outpatient", "pharmacy", "lab", "radiology"]);
      description = `Standard ${claimType} medical service`;
    }

    const serviceDate = new Date(Date.now() - Math.random() * 90 * 86400000);
    const lengthOfStay = claimType === "inpatient" || claimType === "surgery"
      ? Math.max(1, Math.floor(amount / 8000))
      : null;

    out.push({
      claimNumber: `CLM-GEN-${t0}-${String(i).padStart(4, "0")}`,
      memberId: member.id,
      providerId: provider.id,
      practitionerId: practitioner?.id ?? null,
      claimType,
      serviceDate: serviceDate.toISOString(),
      amount,
      primaryDiagnosis: primary,
      icdCodes: icd,
      cptCodes: cpt,
      description,
      specialty: provider.specialty,
      city: provider.city,
      providerType: provider.providerType,
      lengthOfStay,
      quantity: 1,
      isPreAuthorized,
    });
  }
  return out;
}

// =============================================================================
// COERCE — defensive normalization of one LLM-produced row into the canonical
// shape the ingest pipeline expects. We never trust the LLM blindly: missing
// fields fall back to the grounding pool, types are coerced, and ids that
// don't exist in the pool are replaced so we never violate the FK.
// =============================================================================

function coerceClaim(raw: unknown, plan: GenerationPlan, pool: GroundingPool, idx: number): GeneratedClaimRow {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const t0 = Date.now().toString(36).toUpperCase();

  const knownProviderIds = new Set(pool.providers.map((p) => p.id));
  const knownMemberIds = new Set(pool.members.map((m) => m.id));
  const knownPractitionerIds = new Set(pool.practitioners.map((d) => d.id));

  let providerId = String(r.providerId ?? "");
  if (!knownProviderIds.has(providerId)) providerId = pool.providers[0]?.id ?? providerId;
  let memberId = String(r.memberId ?? "");
  if (!knownMemberIds.has(memberId)) memberId = pool.members[0]?.id ?? memberId;
  let practitionerId: string | null = r.practitionerId ? String(r.practitionerId) : null;
  if (practitionerId && !knownPractitionerIds.has(practitionerId)) practitionerId = pool.practitioners[0]?.id ?? null;

  // Hard-enforce wizard targetEntity on every row regardless of what the
  // LLM returned. The prompt asks for it, but the model can drift; this
  // post-coercion guarantees the wizard's intent is respected so users
  // can reliably generate "claims for provider X" without per-row checks.
  if (plan.targetEntity?.type === "provider") providerId = plan.targetEntity.id;
  else if (plan.targetEntity?.type === "member") memberId = plan.targetEntity.id;
  else if (plan.targetEntity?.type === "practitioner") practitionerId = plan.targetEntity.id;

  const provider = pool.providers.find((p) => p.id === providerId) ?? pool.providers[0];

  const amountRaw = typeof r.amount === "number" ? r.amount : parseFloat(String(r.amount ?? "0"));
  const amount = Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : 1000;

  const serviceDateRaw = r.serviceDate ? new Date(String(r.serviceDate)) : new Date();
  const serviceDate = isNaN(serviceDateRaw.getTime()) ? new Date() : serviceDateRaw;

  const claimType = (() => {
    const v = String(r.claimType ?? "").toLowerCase();
    return CLAIM_TYPES.includes(v) ? v : "outpatient";
  })();

  // Restrict ICD/CPT to the grounding pool (or the explicit code-mix the
  // wizard caller passed in) so the LLM can't drift to codes the engines
  // have never seen. Out-of-pool codes are dropped, then any remaining
  // shortfall is back-filled from the pool.
  const allowedIcd = new Set(
    plan.codeMix?.icdCodes && plan.codeMix.icdCodes.length > 0
      ? plan.codeMix.icdCodes
      : pool.icd.map((i) => i.code)
  );
  const allowedCpt = new Set(
    plan.codeMix?.cptCodes && plan.codeMix.cptCodes.length > 0
      ? plan.codeMix.cptCodes
      : pool.cpt.map((c) => c.code)
  );
  const rawIcd = Array.isArray(r.icdCodes) ? r.icdCodes.map(String).filter(Boolean) : [];
  const rawCpt = Array.isArray(r.cptCodes) ? r.cptCodes.map(String).filter(Boolean) : [];
  let icdCodes = allowedIcd.size > 0 ? rawIcd.filter((c) => allowedIcd.has(c)) : rawIcd;
  let cptCodes = allowedCpt.size > 0 ? rawCpt.filter((c) => allowedCpt.has(c)) : rawCpt;
  if (icdCodes.length === 0 && allowedIcd.size > 0) icdCodes = [Array.from(allowedIcd)[0]];
  if (cptCodes.length === 0 && allowedCpt.size > 0) cptCodes = [Array.from(allowedCpt)[0]];
  const primaryRaw = String(r.primaryDiagnosis ?? icdCodes[0] ?? Array.from(allowedIcd)[0] ?? "Z00.00");
  const primaryDiagnosis = allowedIcd.size === 0 || allowedIcd.has(primaryRaw)
    ? primaryRaw
    : icdCodes[0] ?? Array.from(allowedIcd)[0] ?? primaryRaw;
  if (!icdCodes.includes(primaryDiagnosis)) icdCodes = [primaryDiagnosis, ...icdCodes];

  return {
    claimNumber: String(r.claimNumber || `CLM-GEN-${t0}-${String(idx).padStart(4, "0")}`),
    memberId,
    providerId,
    practitionerId,
    claimType,
    serviceDate: serviceDate.toISOString(),
    amount,
    primaryDiagnosis,
    icdCodes: icdCodes.length > 0 ? icdCodes : [primaryDiagnosis],
    cptCodes: cptCodes.length > 0 ? cptCodes : [pool.cpt[0]?.code ?? "99213"],
    description: String(r.description ?? `${claimType} claim`),
    specialty: r.specialty ? String(r.specialty) : provider?.specialty ?? null,
    city: r.city ? String(r.city) : provider?.city ?? null,
    providerType: r.providerType ? String(r.providerType) : provider?.providerType ?? null,
    lengthOfStay: typeof r.lengthOfStay === "number" ? r.lengthOfStay : null,
    quantity: typeof r.quantity === "number" ? r.quantity : 1,
    isPreAuthorized: typeof r.isPreAuthorized === "boolean" ? r.isPreAuthorized : true,
  };
}

// =============================================================================
// PUBLIC ENTRYPOINT
// =============================================================================

/**
 * Generate synthetic claims and hand them to the smart ingestion pipeline.
 * The returned job is the ingestion job — callers can poll it via
 * GET /api/fwa/ingest/:jobId or its alias GET /api/fwa/test-cases/:jobId.
 *
 * The job is tagged with sourceType="generated" so the pipeline writes
 * claims_v2.source="generated" (vs "fwa_ingest" for uploads), which lets
 * downstream consumers filter generated claims later.
 */
export async function generateTestCases(
  req: GenerateRequest,
  opts: { createdBy?: string; jobName?: string } = {}
): Promise<FwaIngestJob> {
  const plan = planFromRequest(req);
  const jobName =
    opts.jobName ||
    `Test cases (${req.mode}, n=${plan.count}, severity=${plan.severity})`;

  // Use createGenerationJob so the POST endpoint can return immediately
  // with a jobId in currentStage="generating". The actual LLM call (which
  // can take 5–30s for larger batches) happens in the background, and the
  // status endpoint walks the unified timeline:
  //   generating → queued → parsing → ... → completed.
  return createGenerationJob({
    jobName,
    createdBy: opts.createdBy,
    generator: async () => {
      const pool = await buildGroundingPool(plan.targetEntity);
      if (pool.providers.length === 0 || pool.members.length === 0) {
        throw new Error(
          "Cannot generate test claims: provider or member directory is empty. Seed providers/members first."
        );
      }

      let rows: GeneratedClaimRow[];
      let llmUsed = false;
      try {
        rows = await generateWithLlm(plan, pool);
        if (rows.length === 0) throw new Error("LLM returned empty claim list");
        llmUsed = true;
        // If the LLM under-delivered, top up via the deterministic fallback so
        // the caller actually gets the count they asked for.
        if (rows.length < plan.count) {
          const topup = fallbackGenerate(
            { ...plan, count: plan.count - rows.length, scenarioMix: plan.scenarioMix.slice(rows.length) },
            pool
          );
          rows = rows.concat(topup);
        }
      } catch (err) {
        console.warn(
          `[TestCaseGen] LLM generation failed; using deterministic fallback. ${err instanceof Error ? err.message : err}`
        );
        rows = fallbackGenerate(plan, pool);
      }

      // Hard-cap to the requested count. The LLM occasionally over-returns
      // (e.g. asked for 3, returned 5). Trimming here keeps the contract
      // strict so callers always get exactly what they asked for.
      if (rows.length > plan.count) rows = rows.slice(0, plan.count);

      // Defense-in-depth: ensure claim numbers are unique within the batch so
      // the ingest pipeline doesn't reject duplicates after a partial top-up.
      const seen = new Set<string>();
      rows = rows.map((row, i) => {
        if (!seen.has(row.claimNumber)) {
          seen.add(row.claimNumber);
          return row;
        }
        const t0 = Date.now().toString(36).toUpperCase();
        const claimNumber = `CLM-GEN-${t0}-DUP-${String(i).padStart(4, "0")}`;
        seen.add(claimNumber);
        return { ...row, claimNumber };
      });

      const buffer = Buffer.from(JSON.stringify({ claims: rows }), "utf-8");
      console.log(
        `[TestCaseGen] generation complete — mode=${req.mode}, requested=${plan.count}, produced=${rows.length}, llm=${llmUsed}`
      );
      return {
        buffer,
        fileName: `generated-${Date.now()}.json`,
        // Persisted on job.summary.generation so callers polling the status
        // endpoint can see what was asked for vs. produced — independent of
        // the detection summary that runJob writes at the end.
        generationSummary: {
          mode: req.mode,
          requestedCount: plan.count,
          producedCount: rows.length,
          severity: plan.severity,
          scenarioMix: plan.scenarioMix,
          llmGrounded: llmUsed,
          targetEntity: plan.targetEntity,
        },
      };
    },
  });
}
