import { EventEmitter } from "events";
import * as path from "path";
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as os from "os";
import * as readline from "readline";
import { randomUUID } from "crypto";
import XLSX from "xlsx";
import { eq, asc, desc, inArray, and, count } from "drizzle-orm";
import { db } from "../db";
import {
  fwaIngestJobs,
  fwaIngestRows,
  claims,
  fwaDetectionResults,
  members,
  providers,
  practitioners,
  type FwaIngestJob,
  type FwaIngestRow,
  type InsertFwaIngestJob,
  type InsertFwaIngestRow,
} from "@shared/schema";
import {
  runProductionDetection,
  type AnalyzedClaimData,
} from "./production-detection-engine";

export const ingestionEvents = new EventEmitter();
ingestionEvents.setMaxListeners(50);

// Per-claim 5-engine weights (sum = 1.0). Engines that are ineligible for a
// row are zeroed out and the composite is renormalized over remaining weights.
const FIVE_ENGINE_WEIGHTS: Record<EngineName, number> = {
  rule_engine: 0.30,
  statistical_learning: 0.22,
  unsupervised_learning: 0.18,
  rag_llm: 0.15,
  semantic_validation: 0.15,
};

// Subset passed to runProductionDetection (it only knows the first 4 engines).
type FourEngineWeights = {
  rule_engine: number;
  statistical_learning: number;
  unsupervised_learning: number;
  rag_llm: number;
};
const FOUR_ENGINE_WEIGHTS: FourEngineWeights = {
  rule_engine: FIVE_ENGINE_WEIGHTS.rule_engine,
  statistical_learning: FIVE_ENGINE_WEIGHTS.statistical_learning,
  unsupervised_learning: FIVE_ENGINE_WEIGHTS.unsupervised_learning,
  rag_llm: FIVE_ENGINE_WEIGHTS.rag_llm,
};

export type EngineName =
  | "rule_engine"
  | "statistical_learning"
  | "unsupervised_learning"
  | "rag_llm"
  | "semantic_validation";

export type RecommendedAction = "pay" | "review" | "deny";
export type RowOutcomeStatus = "completed" | "partial" | "skipped" | "failed";

// Risk-level → strict 3-value action contract required by downstream consumers.
function deriveAction(level: string): RecommendedAction {
  switch (level) {
    case "critical":
      return "deny";
    case "high":
      return "deny";
    case "medium":
      return "review";
    default:
      return "pay";
  }
}

const CANONICAL_FIELDS = [
  { field: "claimNumber", required: true, aliases: ["claim_id", "claim_number", "claim_no", "claim_ref", "claim_reference", "claimreference", "id", "reference"] },
  { field: "memberId", required: true, aliases: ["member_id", "patient_id", "patientid", "beneficiary_id", "patient", "subscriber_id"] },
  { field: "providerId", required: true, aliases: ["provider_id", "providerid", "facility_id", "hospital_id", "provider"] },
  { field: "practitionerId", required: false, aliases: ["practitioner_id", "doctor_id", "practitionerlicense", "physician_id"] },
  { field: "claimType", required: false, aliases: ["claim_type", "type", "visit_type"] },
  { field: "serviceDate", required: true, aliases: ["service_date", "date_of_service", "dos", "claim_date", "treatment_date", "startdate", "claimoccurrencedate"] },
  { field: "amount", required: true, aliases: ["amount", "total_amount", "billed_amount", "claim_amount", "total", "charge", "unit_price", "unitprice"] },
  { field: "primaryDiagnosis", required: true, aliases: ["primary_diagnosis", "principaldiagnosiscode", "icd_code", "icd10", "diagnosis", "diagnosis_code", "dx_code"] },
  { field: "icdCodes", required: false, aliases: ["icd_codes", "secondarydiagnosiscodes", "icd10_codes", "diagnosis_codes"] },
  { field: "cptCodes", required: false, aliases: ["cpt_codes", "service_code", "servicecode", "procedure_code", "cpt", "hcpcs", "claimbenefitcode"] },
  { field: "description", required: false, aliases: ["description", "service_description", "servicedescription", "providerservicedescription"] },
  { field: "specialty", required: false, aliases: ["specialty", "specialtycode", "spec_code", "department"] },
  { field: "city", required: false, aliases: ["city", "location", "facility_city"] },
  { field: "providerType", required: false, aliases: ["provider_type", "providertype", "facility_type"] },
  { field: "lengthOfStay", required: false, aliases: ["length_of_stay", "lengthofstay", "los"] },
  { field: "quantity", required: false, aliases: ["quantity", "qty", "units", "duration"] },
  { field: "isPreAuthorized", required: false, aliases: ["is_pre_authorized", "preauth", "pre_authorized", "preauthstatus"] },
];

export interface CanonicalMapping {
  schemaField: string;
  sourceColumn: string | null;
  confidence: number;
  reason?: string;
  required: boolean;
  needsConfirmation?: boolean;
}

export interface ColumnMappingResult {
  confidence: number;
  overallConfidence: number;
  mappings: CanonicalMapping[];
  unmappedColumns: string[];
  warnings: string[];
  autoMapped: boolean;
}

export type SourceFormat = "excel" | "csv" | "json";

export interface SourceReader {
  format: SourceFormat;
  headers: string[];
  // Number of data rows; -1 if unknown ahead of time (rare, used as a signal).
  totalRows: number;
  // Streaming iterator over rows. Implementations may stream from disk to avoid
  // loading the whole file into memory.
  rows(): AsyncIterable<Record<string, any>>;
}

// =============================================================================
// PARSERS — file-path based, streaming where the format allows.
// Excel/JSON load the full document (library/format constraint) but read
// directly from disk without keeping the source buffer in any in-memory map.
// CSV/TSV stream line-by-line via readline.
// =============================================================================

function detectFormat(fileName: string): SourceFormat {
  const ext = (path.extname(fileName) || "").toLowerCase();
  if (ext === ".xlsx" || ext === ".xls") return "excel";
  if (ext === ".json") return "json";
  return "csv";
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else { cur += c; }
    } else {
      if (c === ",") { out.push(cur); cur = ""; }
      else if (c === '"') { inQ = true; }
      else { cur += c; }
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

async function readCsvHeaderAndCount(filePath: string): Promise<{ headers: string[]; total: number }> {
  const stream = fs.createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let headers: string[] = [];
  let total = 0;
  let isFirst = true;
  for await (const raw of rl) {
    const line = raw.trim();
    if (!line) continue;
    if (isFirst) { headers = splitCsvLine(line); isFirst = false; }
    else total++;
  }
  return { headers, total };
}

function csvRowIterator(filePath: string, headers: string[]): AsyncIterable<Record<string, any>> {
  return {
    async *[Symbol.asyncIterator]() {
      const stream = fs.createReadStream(filePath, { encoding: "utf-8" });
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
      let isFirst = true;
      for await (const raw of rl) {
        const line = raw.trim();
        if (!line) continue;
        if (isFirst) { isFirst = false; continue; }
        const cells = splitCsvLine(line);
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
          const v = cells[idx];
          row[h] = v === undefined || v === "" ? null : v;
        });
        yield row;
      }
    },
  };
}

// Excel and JSON cannot be safely streamed with the libraries currently in
// use (xlsx is whole-document; ad-hoc JSON has no row-record framing). To
// keep memory bounded we enforce explicit per-format byte ceilings and
// reject oversize uploads with a clear, surfaceable error rather than
// silently swallowing memory. CSV remains streamed line-by-line and is
// effectively unbounded in size. Operators can override these via env vars
// if their deployment can afford larger working sets.
const MAX_EXCEL_BYTES = Number(process.env.FWA_INGEST_MAX_EXCEL_BYTES || 50 * 1024 * 1024); // 50 MB default
const MAX_JSON_BYTES = Number(process.env.FWA_INGEST_MAX_JSON_BYTES || 100 * 1024 * 1024); // 100 MB default

class IngestSourceTooLargeError extends Error {
  readonly code = "SOURCE_TOO_LARGE";
  constructor(message: string) {
    super(message);
    this.name = "IngestSourceTooLargeError";
  }
}

async function buildExcelReader(filePath: string): Promise<SourceReader> {
  const stat = await fsp.stat(filePath);
  if (stat.size > MAX_EXCEL_BYTES) {
    throw new IngestSourceTooLargeError(
      `Excel source is ${stat.size} bytes which exceeds the ${MAX_EXCEL_BYTES}-byte limit. ` +
        `Convert the file to CSV (which is streamed and effectively unbounded) ` +
        `or raise FWA_INGEST_MAX_EXCEL_BYTES if your deployment can afford the memory.`
    );
  }
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null, raw: false });
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
  const headers: string[] = rows.length > 0
    ? Object.keys(rows[0])
    : Array.isArray(aoa[0]) ? (aoa[0] as string[]) : [];
  return {
    format: "excel",
    headers,
    totalRows: rows.length,
    rows: () => ({
      async *[Symbol.asyncIterator]() {
        for (const r of rows) yield r;
      },
    }),
  };
}

async function buildJsonReader(filePath: string): Promise<SourceReader> {
  const stat = await fsp.stat(filePath);
  if (stat.size > MAX_JSON_BYTES) {
    throw new IngestSourceTooLargeError(
      `JSON source is ${stat.size} bytes which exceeds the ${MAX_JSON_BYTES}-byte limit. ` +
        `Convert the file to CSV (which is streamed and effectively unbounded) ` +
        `or raise FWA_INGEST_MAX_JSON_BYTES if your deployment can afford the memory.`
    );
  }
  const text = await fsp.readFile(filePath, "utf-8");
  const data = JSON.parse(text) as unknown;
  let arr: Array<Record<string, any>>;
  if (Array.isArray(data)) arr = data as Array<Record<string, any>>;
  else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.claims)) arr = obj.claims as Array<Record<string, any>>;
    else if (Array.isArray(obj.rows)) arr = obj.rows as Array<Record<string, any>>;
    else arr = [obj as Record<string, any>];
  } else {
    arr = [];
  }
  const headerSet = new Set<string>();
  for (const r of arr) {
    if (r && typeof r === "object") Object.keys(r).forEach((k) => headerSet.add(k));
  }
  return {
    format: "json",
    headers: Array.from(headerSet),
    totalRows: arr.length,
    rows: () => ({
      async *[Symbol.asyncIterator]() {
        for (const r of arr) yield r;
      },
    }),
  };
}

async function buildCsvReader(filePath: string): Promise<SourceReader> {
  const { headers, total } = await readCsvHeaderAndCount(filePath);
  return {
    format: "csv",
    headers,
    totalRows: total,
    rows: () => csvRowIterator(filePath, headers),
  };
}

export async function buildSourceReader(filePath: string, fileName: string): Promise<SourceReader> {
  const fmt = detectFormat(fileName);
  if (fmt === "excel") return buildExcelReader(filePath);
  if (fmt === "json") return buildJsonReader(filePath);
  return buildCsvReader(filePath);
}

// Sample first N rows from a reader (used by the LLM column mapper).
async function sampleReader(reader: SourceReader, n: number): Promise<Array<Record<string, any>>> {
  const out: Array<Record<string, any>> = [];
  for await (const r of reader.rows()) {
    out.push(r);
    if (out.length >= n) break;
  }
  return out;
}

// =============================================================================
// LLM-BASED SMART COLUMN MAPPER
// =============================================================================

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function heuristicMapping(headers: string[]): ColumnMappingResult {
  const usedColumns = new Set<string>();
  const mappings: CanonicalMapping[] = [];
  const headerNorm: Map<string, string> = new Map(headers.map((h) => [normalizeKey(h), h]));

  for (const cf of CANONICAL_FIELDS) {
    let matched: string | null = null;
    let confidence = 0;
    let reason = "";

    const directNorm = normalizeKey(cf.field);
    if (headerNorm.has(directNorm)) {
      matched = headerNorm.get(directNorm)!;
      confidence = 95;
      reason = "exact field-name match";
    } else {
      for (const alias of cf.aliases) {
        const aNorm = normalizeKey(alias);
        if (headerNorm.has(aNorm)) {
          matched = headerNorm.get(aNorm)!;
          confidence = 88;
          reason = `alias match (${alias})`;
          break;
        }
      }
      if (!matched) {
        // partial contains
        for (const h of headers) {
          const hn = normalizeKey(h);
          if (cf.aliases.some((a) => hn.includes(normalizeKey(a))) || hn.includes(directNorm)) {
            matched = h;
            confidence = 65;
            reason = "partial header similarity";
            break;
          }
        }
      }
    }

    if (matched && usedColumns.has(matched)) {
      matched = null;
      confidence = 0;
    }
    if (matched) usedColumns.add(matched);

    mappings.push({
      schemaField: cf.field,
      sourceColumn: matched,
      confidence,
      reason: matched ? reason : "no header match",
      required: cf.required,
      needsConfirmation: !!matched && confidence < 70,
    });
  }

  const unmappedColumns = headers.filter((h) => !usedColumns.has(h));
  const requiredMapped = mappings.filter((m) => m.required && m.sourceColumn).length;
  const requiredTotal = mappings.filter((m) => m.required).length;
  const overallConfidence = requiredTotal > 0
    ? Math.round((requiredMapped / requiredTotal) * 100)
    : 0;

  const warnings: string[] = [];
  const missingRequired = mappings.filter((m) => m.required && !m.sourceColumn).map((m) => m.schemaField);
  if (missingRequired.length > 0) {
    warnings.push(`Missing required fields after heuristic mapping: ${missingRequired.join(", ")}`);
  }

  return {
    confidence: overallConfidence,
    overallConfidence,
    mappings,
    unmappedColumns,
    warnings,
    autoMapped: true,
  };
}

export async function autoMapColumns(
  headers: string[],
  sampleRows: Array<Record<string, any>> = []
): Promise<ColumnMappingResult> {
  const heuristic = heuristicMapping(headers);
  // If heuristic already covers all required fields confidently, skip LLM call.
  const allRequiredCovered = heuristic.mappings.every(
    (m) => !m.required || (m.sourceColumn && m.confidence >= 80)
  );
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (allRequiredCovered || !apiKey) {
    return heuristic;
  }

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({
      apiKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
    });
    const samplePreview = sampleRows.slice(0, 3);
    const systemPrompt = `You are a data mapping expert for healthcare claims. Map uploaded file columns to the canonical FWA claim schema.\n\nCanonical fields:\n${CANONICAL_FIELDS.map((f) => `- ${f.field} (${f.required ? "REQUIRED" : "optional"}); aliases: ${f.aliases.join(", ")}`).join("\n")}\n\nFile columns: ${headers.join(", ")}\nSample rows: ${JSON.stringify(samplePreview).slice(0, 4000)}\n\nRespond as JSON: { "mappings": [ { "schemaField": string, "sourceColumn": string|null, "confidence": 0-100, "reason": string } ], "warnings": string[] }`;
    const resp = await client.chat.completions.create({
      model: process.env.AI_INTEGRATIONS_OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Return the JSON mapping now." },
      ],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });
    const content = resp.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const llmMappings: any[] = Array.isArray(parsed.mappings) ? parsed.mappings : [];
    const mappings: CanonicalMapping[] = CANONICAL_FIELDS.map((cf) => {
      const llm = llmMappings.find((m) => m.schemaField === cf.field);
      const heur = heuristic.mappings.find((m) => m.schemaField === cf.field)!;
      // Prefer LLM result when it gives a column AND confidence beats heuristic (or heuristic empty)
      if (llm && llm.sourceColumn && headers.includes(llm.sourceColumn)) {
        const llmConf = Number(llm.confidence) || 0;
        if (!heur.sourceColumn || llmConf > heur.confidence) {
          return {
            schemaField: cf.field,
            sourceColumn: llm.sourceColumn,
            confidence: llmConf,
            reason: llm.reason || "LLM mapping",
            required: cf.required,
            needsConfirmation: llmConf < 70,
          };
        }
      }
      return heur;
    });
    const usedSet = new Set(mappings.map((m) => m.sourceColumn).filter((c): c is string => !!c));
    const unmappedColumns = headers.filter((h) => !usedSet.has(h));
    const requiredMapped = mappings.filter((m) => m.required && m.sourceColumn).length;
    const requiredTotal = mappings.filter((m) => m.required).length;
    const overallConfidence = requiredTotal > 0 ? Math.round((requiredMapped / requiredTotal) * 100) : 0;
    const warnings: string[] = Array.isArray(parsed.warnings) ? parsed.warnings : [];
    const missingRequired = mappings.filter((m) => m.required && !m.sourceColumn).map((m) => m.schemaField);
    if (missingRequired.length > 0) {
      warnings.push(`Missing required fields: ${missingRequired.join(", ")}`);
    }
    return {
      confidence: overallConfidence,
      overallConfidence,
      mappings,
      unmappedColumns,
      warnings,
      autoMapped: true,
    };
  } catch (err: any) {
    console.warn(`[FwaIngest] LLM column mapping failed; using heuristic. ${err?.message || err}`);
    return heuristic;
  }
}

// =============================================================================
// ROW NORMALIZATION
// =============================================================================

function coerceNumber(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function coerceInt(v: any): number | null {
  const n = coerceNumber(v);
  return n === null ? null : Math.round(n);
}

function coerceBool(v: any): boolean | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["true", "yes", "y", "1", "approved", "preauthorized"].includes(s)) return true;
  if (["false", "no", "n", "0"].includes(s)) return false;
  return null;
}

function coerceDate(v: any): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  // Excel serial date number
  if (typeof v === "number" && v > 25569 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function coerceArray(v: any): string[] | null {
  if (v === null || v === undefined || v === "") return null;
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  return String(v).split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
}

export interface NormalizedClaim {
  claimNumber: string;
  memberId: string | null;
  providerId: string | null;
  practitionerId: string | null;
  claimType: string;
  serviceDate: Date | null;
  amount: number | null;
  primaryDiagnosis: string | null;
  icdCodes: string[] | null;
  cptCodes: string[] | null;
  description: string | null;
  specialty: string | null;
  city: string | null;
  providerType: string | null;
  lengthOfStay: number | null;
  quantity: number | null;
  isPreAuthorized: boolean | null;
}

export interface NormalizedRowResult {
  rowIndex: number;
  raw: Record<string, any>;
  normalized: NormalizedClaim;
  missingFields: string[];
  ineligibleEngines: Array<{ engine: string; reason: string }>;
  status: "ok" | "partial" | "invalid";
}

function applyMapping(row: Record<string, any>, mapping: ColumnMappingResult): Record<string, any> {
  const out: Record<string, any> = {};
  for (const m of mapping.mappings) {
    if (m.sourceColumn) out[m.schemaField] = row[m.sourceColumn];
  }
  return out;
}

export function normalizeRow(
  row: Record<string, any>,
  mapping: ColumnMappingResult,
  rowIndex: number
): NormalizedRowResult {
  const mapped = applyMapping(row, mapping);
  const claimNumber = mapped.claimNumber ? String(mapped.claimNumber) : `AUTO-${Date.now()}-${rowIndex}`;
  const memberId = mapped.memberId ? String(mapped.memberId) : null;
  const providerId = mapped.providerId ? String(mapped.providerId) : null;
  const practitionerId = mapped.practitionerId ? String(mapped.practitionerId) : null;
  const claimType = mapped.claimType ? String(mapped.claimType) : "outpatient";
  const serviceDate = coerceDate(mapped.serviceDate);
  const amount = coerceNumber(mapped.amount);
  const primaryDiagnosis = mapped.primaryDiagnosis ? String(mapped.primaryDiagnosis) : null;
  const icdCodes = coerceArray(mapped.icdCodes);
  const cptCodes = coerceArray(mapped.cptCodes);
  const description = mapped.description ? String(mapped.description) : null;
  const specialty = mapped.specialty ? String(mapped.specialty) : null;
  const city = mapped.city ? String(mapped.city) : null;
  const providerType = mapped.providerType ? String(mapped.providerType) : null;
  const lengthOfStay = coerceInt(mapped.lengthOfStay);
  const quantity = coerceNumber(mapped.quantity);
  const isPreAuthorized = coerceBool(mapped.isPreAuthorized);

  // Required canonical fields: missing any → row is INVALID (skipped, never persisted).
  // Optional fields missing → row is PARTIAL (persisted with engine eligibility gating).
  const missingRequired: string[] = [];
  if (!memberId) missingRequired.push("memberId");
  if (!providerId) missingRequired.push("providerId");
  if (!serviceDate) missingRequired.push("serviceDate");
  if (amount === null) missingRequired.push("amount");
  if (!primaryDiagnosis) missingRequired.push("primaryDiagnosis");

  const missingOptional: string[] = [];
  if (!practitionerId) missingOptional.push("practitionerId");
  if (!description) missingOptional.push("description");
  if (!cptCodes || cptCodes.length === 0) missingOptional.push("cptCodes");
  if (!specialty) missingOptional.push("specialty");
  if (!providerType) missingOptional.push("providerType");

  // Per-engine eligibility — only computed for non-invalid rows. RAG/LLM and
  // semantic require text context (description and/or diagnosis); both required
  // fields are present so semantic baseline is met but description-rich text
  // boosts evaluation quality.
  const ineligible: Array<{ engine: string; reason: string }> = [];
  if (!description && !primaryDiagnosis) {
    ineligible.push({ engine: "rag_llm", reason: "no diagnosis or description text" });
  }
  if (!description) {
    ineligible.push({ engine: "semantic_validation", reason: "service description missing" });
  }

  const status: "ok" | "partial" | "invalid" = missingRequired.length > 0
    ? "invalid"
    : (missingOptional.length > 0 || ineligible.length > 0)
      ? "partial"
      : "ok";

  // Surface ALL missing fields (required + optional) for downstream visibility.
  const missing = [...missingRequired, ...missingOptional];

  return {
    rowIndex,
    raw: row,
    normalized: {
      claimNumber,
      memberId,
      providerId,
      practitionerId,
      claimType,
      serviceDate,
      amount,
      primaryDiagnosis,
      icdCodes,
      cptCodes,
      description,
      specialty,
      city,
      providerType,
      lengthOfStay,
      quantity,
      isPreAuthorized,
    },
    missingFields: missing,
    ineligibleEngines: ineligible,
    status,
  };
}

// =============================================================================
// SEMANTIC ENGINE (per-claim, in-process)
// =============================================================================

function classifyServiceType(text: string | null | undefined): string {
  const t = (text || "").toLowerCase();
  if (/tablet|capsule|\bmg\b|injection|drug/.test(t)) return "medication";
  if (/surgery|repair|removal|replacement|excision/.test(t)) return "surgery";
  if (/x-?ray|\bct\b|mri|ultrasound|scan|imaging/.test(t)) return "imaging";
  if (/\blab\b|blood|culture|test|panel/.test(t)) return "laboratory";
  if (/consult|evaluation|visit|exam|assessment/.test(t)) return "evaluation";
  if (/therapy|rehabilitation|physio/.test(t)) return "therapy";
  return "other";
}

interface SemanticResult {
  score: number;
  reason: string;
  findings: {
    diagnosisChapter: string;
    serviceCategory: string;
    alignmentScore: number;
    mismatchReasons: string[];
    flaggedTerms: string[];
  };
}

function computeSemanticScore(claim: AnalyzedClaimData): SemanticResult {
  const icdChapter = (claim.primaryDiagnosis || "").toUpperCase().slice(0, 1);
  const serviceType = classifyServiceType(claim.description);
  let score: number;
  const mismatchReasons: string[] = [];
  const flaggedTerms: string[] = [];
  if (["I", "E"].includes(icdChapter) && serviceType === "medication") score = 18;
  else if (["A", "B", "J"].includes(icdChapter) && ["medication", "laboratory"].includes(serviceType)) score = 16;
  else if (["M", "S", "T"].includes(icdChapter) && ["medication", "imaging", "therapy"].includes(serviceType)) score = 22;
  else if (["C", "D"].includes(icdChapter) && ["surgery", "medication", "imaging"].includes(serviceType)) score = 25;
  else if (icdChapter === "R" && ["evaluation", "laboratory", "imaging"].includes(serviceType)) score = 12;
  else if (icdChapter === "Z" && ["evaluation", "laboratory"].includes(serviceType)) score = 10;
  else if (icdChapter === "F" && serviceType === "surgery") {
    score = 60;
    mismatchReasons.push("Mental-health diagnosis paired with surgical service");
    flaggedTerms.push("F-chapter+surgery");
  } else if (icdChapter === "Z" && serviceType === "surgery") {
    score = 65;
    mismatchReasons.push("Wellness/screening diagnosis paired with surgical service");
    flaggedTerms.push("Z-chapter+surgery");
  } else if (serviceType === "evaluation") {
    score = 28;
    mismatchReasons.push("Generic evaluation without strong diagnosis alignment");
  } else if (serviceType === "medication") {
    score = 30;
    mismatchReasons.push("Medication without strong diagnosis alignment");
  } else {
    score = 35;
    mismatchReasons.push("Diagnosis/service category combination is uncommon");
  }
  const reason = `ICD chapter "${icdChapter}" with service type "${serviceType}"`;
  const rounded = Math.round(score * 100) / 100;
  // Higher score = lower alignment; alignment is the inverse on a 0-100 scale.
  const alignmentScore = Math.max(0, Math.round((100 - rounded) * 100) / 100);
  return {
    score: rounded,
    reason,
    findings: {
      diagnosisChapter: icdChapter || "unknown",
      serviceCategory: serviceType,
      alignmentScore,
      mismatchReasons,
      flaggedTerms,
    },
  };
}

// =============================================================================
// PERSISTENCE & ENGINE ORCHESTRATION
// =============================================================================

interface PersistResult {
  claimId: string;
  claimNumber: string;
}

async function ensureMember(memberId: string): Promise<void> {
  const [existing] = await db.select({ id: members.id }).from(members).where(eq(members.id, memberId)).limit(1);
  if (existing) return;
  try {
    await db.insert(members).values({
      id: memberId,
      payerId: "ingest-stub",
      name: `Ingested member ${memberId}`,
      dateOfBirth: "1980-01-01",
      gender: "unknown",
    }).onConflictDoNothing();
  } catch (err) {
    // Race-safe: ignore conflict
  }
}

async function ensureProvider(providerId: string, providerType: string | null, specialty: string | null, city: string | null): Promise<void> {
  const [existing] = await db.select({ id: providers.id }).from(providers).where(eq(providers.id, providerId)).limit(1);
  if (existing) return;
  try {
    await db.insert(providers).values({
      id: providerId,
      name: `Ingested provider ${providerId}`,
      providerType: providerType || "unknown",
      specialty: specialty || null,
      city: city || null,
    }).onConflictDoNothing();
  } catch (err) {
    // ignore
  }
}

async function ensurePractitioner(practitionerId: string, specialty: string | null): Promise<void> {
  const [existing] = await db.select({ id: practitioners.id }).from(practitioners).where(eq(practitioners.id, practitionerId)).limit(1);
  if (existing) return;
  try {
    await db.insert(practitioners).values({
      id: practitionerId,
      name: `Ingested practitioner ${practitionerId}`,
      specialty: specialty || "unknown",
    }).onConflictDoNothing();
  } catch (err) {
    // ignore
  }
}

async function persistClaim(n: NormalizedClaim): Promise<PersistResult> {
  // Caller MUST have validated all required fields before invoking this. Throw
  // loudly rather than silently inventing placeholder values.
  if (!n.memberId || !n.providerId || !n.serviceDate || n.amount === null || !n.primaryDiagnosis) {
    throw new Error(
      `persistClaim called with missing required fields (memberId=${!!n.memberId}, providerId=${!!n.providerId}, serviceDate=${!!n.serviceDate}, amount=${n.amount !== null}, primaryDiagnosis=${!!n.primaryDiagnosis})`
    );
  }

  const [existing] = await db
    .select({ id: claims.id, claimNumber: claims.claimNumber })
    .from(claims)
    .where(eq(claims.claimNumber, n.claimNumber))
    .limit(1);
  if (existing) {
    return { claimId: existing.id, claimNumber: existing.claimNumber };
  }

  await ensureMember(n.memberId);
  await ensureProvider(n.providerId, n.providerType, n.specialty, n.city);
  if (n.practitionerId) {
    await ensurePractitioner(n.practitionerId, n.specialty);
  }

  const [inserted] = await db
    .insert(claims)
    .values({
      claimNumber: n.claimNumber,
      memberId: n.memberId,
      providerId: n.providerId,
      practitionerId: n.practitionerId,
      claimType: n.claimType,
      registrationDate: n.serviceDate,
      serviceDate: n.serviceDate,
      amount: String(n.amount),
      status: "pending",
      primaryDiagnosis: n.primaryDiagnosis,
      icdCodes: n.icdCodes,
      cptCodes: n.cptCodes,
      description: n.description,
      specialty: n.specialty,
      city: n.city,
      providerType: n.providerType,
      lengthOfStay: n.lengthOfStay,
      isPreAuthorized: n.isPreAuthorized ?? false,
      source: "fwa_ingest",
    })
    .returning({ id: claims.id, claimNumber: claims.claimNumber });
  return { claimId: inserted.id, claimNumber: inserted.claimNumber };
}

type RiskLevel = "critical" | "high" | "medium" | "low";

interface EnginesOutcome {
  compositeScore: number;
  compositeRiskLevel: RiskLevel;
  ruleEngineScore: number;
  statisticalScore: number;
  unsupervisedScore: number;
  ragLlmScore: number;
  semanticScore: number;
  primaryDetectionMethod: EngineName;
  detectionSummary: string;
  recommendedAction: RecommendedAction;
  enginesRun: EngineName[];
  enginesSkipped: Array<{ engine: string; reason: string }>;
  processingTimeMs: number;
  ruleEngineFindings: unknown;
  statisticalFindings: unknown;
  unsupervisedFindings: unknown;
  ragLlmFindings: unknown;
  semanticFindings: SemanticResult["findings"] | null;
}

async function runFiveEngines(
  claim: AnalyzedClaimData,
  ineligible: Array<{ engine: string; reason: string }>,
  options: { skipRagLlm: boolean }
): Promise<EnginesOutcome> {
  const start = Date.now();
  const skipped: Array<{ engine: string; reason: string }> = [...ineligible];
  const ineligibleSet = new Set<EngineName>(ineligible.map((s) => s.engine as EngineName));
  // skipRagLlm is an explicit caller opt-out (e.g. cost-sensitive bulk runs).
  // It defaults to false at the API layer so all five engines run by default
  // for fully-eligible claims — this is part of the task contract.
  if (options.skipRagLlm && !ineligibleSet.has("rag_llm")) {
    skipped.push({ engine: "rag_llm", reason: "explicitly skipped via skipRagLlm flag" });
    ineligibleSet.add("rag_llm");
  }

  // Run 4-engine production detection. Engines deemed ineligible still execute through
  // the production engine, but we zero-out their score afterward and surface them
  // in the skipped list with a reason so downstream consumers can audit it.
  const detection = await runProductionDetection(claim, FOUR_ENGINE_WEIGHTS, options.skipRagLlm);

  let rule = detection.ruleEngineScore;
  let stat = detection.statisticalScore;
  let unsup = detection.unsupervisedScore;
  let rag = detection.ragLlmScore;
  if (ineligibleSet.has("rule_engine")) rule = 0;
  if (ineligibleSet.has("statistical_learning")) stat = 0;
  if (ineligibleSet.has("unsupervised_learning")) unsup = 0;
  if (ineligibleSet.has("rag_llm")) rag = 0;

  // 5th engine: per-claim semantic validation. Note: when ineligible, the
  // skip reason is already in `skipped` (it was copied from `ineligible` at
  // the top of this function). We must NOT push it a second time, otherwise
  // downstream reporting (job summary topReasons) would double-count.
  let semantic = 0;
  let semanticFindings: SemanticResult["findings"] | null = null;
  if (!ineligibleSet.has("semantic_validation")) {
    const sem = computeSemanticScore(claim);
    semantic = sem.score;
    semanticFindings = sem.findings;
  }

  // Recompute composite over only engines that produced a score
  const w = FIVE_ENGINE_WEIGHTS;
  const parts: Array<{ name: EngineName; w: number; s: number }> = [];
  if (!ineligibleSet.has("rule_engine")) parts.push({ name: "rule_engine", w: w.rule_engine, s: rule });
  if (!ineligibleSet.has("statistical_learning")) parts.push({ name: "statistical_learning", w: w.statistical_learning, s: stat });
  if (!ineligibleSet.has("unsupervised_learning")) parts.push({ name: "unsupervised_learning", w: w.unsupervised_learning, s: unsup });
  if (!ineligibleSet.has("rag_llm")) parts.push({ name: "rag_llm", w: w.rag_llm, s: rag });
  if (!ineligibleSet.has("semantic_validation")) parts.push({ name: "semantic_validation", w: w.semantic_validation, s: semantic });

  const totalWeight = parts.reduce((a, p) => a + p.w, 0) || 1;
  const composite = parts.reduce((a, p) => a + p.s * (p.w / totalWeight), 0);
  const compositeRounded = Math.round(composite * 100) / 100;

  let level: RiskLevel = "low";
  if (compositeRounded >= 70) level = "critical";
  else if (compositeRounded >= 50) level = "high";
  else if (compositeRounded >= 25) level = "medium";

  const sortedParts = [...parts].sort((a, b) => b.s - a.s);
  const primary: EngineName = sortedParts[0]?.name ?? "rule_engine";

  const enginesRun: EngineName[] = parts.map((p) => p.name);
  const summaryBits: string[] = [];
  summaryBits.push(`Composite ${compositeRounded.toFixed(1)} (${level})`);
  summaryBits.push(`Engines: ${enginesRun.join(", ")}`);
  if (skipped.length > 0) summaryBits.push(`Skipped: ${skipped.map((s) => `${s.engine}(${s.reason})`).join("; ")}`);

  // Strict pay|review|deny contract for downstream consumers (no free-text).
  const recommendedAction: RecommendedAction = deriveAction(level);

  return {
    compositeScore: compositeRounded,
    compositeRiskLevel: level,
    ruleEngineScore: rule,
    statisticalScore: stat,
    unsupervisedScore: unsup,
    ragLlmScore: rag,
    semanticScore: semantic,
    primaryDetectionMethod: primary,
    detectionSummary: summaryBits.join(" | "),
    recommendedAction,
    enginesRun,
    enginesSkipped: skipped,
    processingTimeMs: Date.now() - start,
    ruleEngineFindings: detection.ruleEngineFindings,
    statisticalFindings: detection.statisticalFindings,
    unsupervisedFindings: detection.unsupervisedFindings,
    ragLlmFindings: detection.ragLlmFindings,
    semanticFindings,
  };
}

type RuleEngineFindings = NonNullable<typeof fwaDetectionResults.$inferInsert.ruleEngineFindings>;
type StatisticalFindings = NonNullable<typeof fwaDetectionResults.$inferInsert.statisticalFindings>;
type UnsupervisedFindings = NonNullable<typeof fwaDetectionResults.$inferInsert.unsupervisedFindings>;
type RagLlmFindings = NonNullable<typeof fwaDetectionResults.$inferInsert.ragLlmFindings>;
type SemanticFindings = NonNullable<typeof fwaDetectionResults.$inferInsert.semanticFindings>;

async function persistDetection(_claimNumber: string, claimDbId: string, providerId: string | null, memberId: string | null, e: EnginesOutcome) {
  // Upsert by claim_id (unique). Use claims_v2.id (the actual primary key)
  // to match the convention of every other writer of fwa_detection_results
  // (claims-routes.ts, fwa-routes.ts, fwa-detection-engine.ts, ...). This
  // keeps downstream joins (recompute, FWA dossier flows) consistent.
  const sharedValues = {
    compositeScore: String(e.compositeScore),
    compositeRiskLevel: e.compositeRiskLevel,
    ruleEngineScore: String(e.ruleEngineScore),
    statisticalScore: String(e.statisticalScore),
    unsupervisedScore: String(e.unsupervisedScore),
    ragLlmScore: String(e.ragLlmScore),
    semanticScore: String(e.semanticScore),
    ruleEngineFindings: (e.ruleEngineFindings ?? null) as RuleEngineFindings | null,
    statisticalFindings: (e.statisticalFindings ?? null) as StatisticalFindings | null,
    unsupervisedFindings: (e.unsupervisedFindings ?? null) as UnsupervisedFindings | null,
    ragLlmFindings: (e.ragLlmFindings ?? null) as RagLlmFindings | null,
    semanticFindings: (e.semanticFindings ?? null) as SemanticFindings | null,
    primaryDetectionMethod: e.primaryDetectionMethod,
    detectionSummary: e.detectionSummary,
    recommendedAction: e.recommendedAction,
    processingTimeMs: e.processingTimeMs,
    analyzedAt: new Date(),
  };
  await db
    .insert(fwaDetectionResults)
    .values({
      claimId: claimDbId,
      providerId: providerId || null,
      patientId: memberId || null,
      ...sharedValues,
    })
    .onConflictDoUpdate({
      target: fwaDetectionResults.claimId,
      set: { ...sharedValues, updatedAt: new Date() },
    });
}

// =============================================================================
// JOB ORCHESTRATION
// =============================================================================

// Persistent staging directory for uploaded source files. Each job's source
// file is referenced by an absolute path (NOT held in memory) and unlinked
// once the job reaches a terminal state. This allows arbitrarily large
// uploads without retaining buffers in any in-process map.
const INGEST_STAGE_DIR = process.env.FWA_INGEST_STAGE_DIR
  || path.join(os.tmpdir(), "fwa-ingest-stage");

async function ensureStageDir(): Promise<string> {
  await fsp.mkdir(INGEST_STAGE_DIR, { recursive: true });
  return INGEST_STAGE_DIR;
}

const pendingSources = new Map<string, { filePath: string; fileName: string }>();
const runningJobs = new Set<string>();

export interface CreateJobOptions {
  // Caller supplies EITHER an already-staged file path (preferred for uploads;
  // multer's diskStorage already wrote the file) OR a buffer (for inline JSON
  // payloads). Buffers are immediately flushed to disk before the job starts
  // so we never retain large payloads in memory.
  filePath?: string;
  buffer?: Buffer;
  fileName: string;
  fileSizeBytes?: number;
  jobName?: string;
  sourceType?: string;
  createdBy?: string;
  skipRagLlm?: boolean;
  mappingOverrides?: Record<string, string>;
  // When true, the worker stops after parsing + auto-mapping and transitions
  // the job to status="awaiting_confirmation" with the inferred column
  // mapping persisted on the job row. The caller can then review the mapping
  // (GET /api/fwa/ingest/:jobId), optionally submit overrides, and resume
  // processing via POST /api/fwa/ingest/:jobId/confirm. This implements the
  // task's "produce a mapping summary, allow user to override before
  // processing starts" requirement. Default false preserves the existing
  // single-call auto-process behavior for backward compatibility.
  requireConfirmation?: boolean;
}

async function stageSource(opts: CreateJobOptions): Promise<{ filePath: string; sizeBytes: number }> {
  await ensureStageDir();
  if (opts.filePath) {
    const stat = await fsp.stat(opts.filePath);
    return { filePath: opts.filePath, sizeBytes: stat.size };
  }
  if (opts.buffer) {
    const ext = path.extname(opts.fileName) || ".dat";
    const stagedPath = path.join(INGEST_STAGE_DIR, `${randomUUID()}${ext}`);
    await fsp.writeFile(stagedPath, opts.buffer);
    return { filePath: stagedPath, sizeBytes: opts.buffer.length };
  }
  throw new Error("createIngestionJob requires either filePath or buffer");
}

export async function createIngestionJob(opts: CreateJobOptions): Promise<FwaIngestJob> {
  const ext = (path.extname(opts.fileName) || "").toLowerCase().replace(".", "") || "csv";
  const { filePath, sizeBytes } = await stageSource(opts);
  const skipRagLlm = opts.skipRagLlm ?? false;
  const requireConfirmation = opts.requireConfirmation ?? false;
  const [job] = await db
    .insert(fwaIngestJobs)
    .values({
      jobName: opts.jobName || opts.fileName,
      sourceType: opts.sourceType || "file_upload",
      sourceFileName: opts.fileName,
      sourceFilePath: filePath,
      sourceFormat: ext,
      sourceSizeBytes: opts.fileSizeBytes ?? sizeBytes,
      skipRagLlm,
      // Persist the two-phase intent so crash/restart recovery
      // (recoverInFlightJobs) can re-arm the pause-at-mapping behavior
      // even when this Node process never reached the pause point.
      requireConfirmation,
      status: "queued",
      progressPct: 0,
      currentStage: "queued",
      createdBy: opts.createdBy || "system",
    })
    .returning();
  pendingSources.set(job.id, { filePath, fileName: opts.fileName });
  // Fire-and-forget worker; do NOT await — endpoint returns immediately.
  // Default skipRagLlm = false: all five engines run by default for fully
  // eligible claims (per task contract). Callers may opt out for cost reasons.
  setImmediate(() => {
    runJob(job.id, {
      skipRagLlm,
      mappingOverrides: opts.mappingOverrides,
      requireConfirmation: opts.requireConfirmation ?? false,
    }).catch((err) => {
      console.error(`[FwaIngest] job ${job.id} crashed:`, err);
    });
  });
  return job;
}

/**
 * Recover any jobs left in a non-terminal state by a previous process. Called
 * once at server bootstrap (see server/index.ts). For each non-terminal job:
 *  - if its staged source file is still on disk, re-queue it for processing;
 *  - if the staged file is missing (lost across crash/restart), mark the job
 *    as failed with a clear, auditable reason rather than letting it sit
 *    forever in a "queued"/"detecting" zombie state.
 *
 * This complements the in-memory worker (setImmediate) by guaranteeing that
 * every persisted job reaches a terminal status (completed | failed) even
 * across process restarts, satisfying the durable async-job contract.
 */
export async function recoverInFlightJobs(): Promise<{ resumed: number; failed: number }> {
  // "awaiting_confirmation" is intentionally excluded — that is a paused
  // state waiting for a human via POST /confirm and must not auto-resume.
  const NON_TERMINAL: FwaIngestJob["status"][] = [
    "queued",
    "parsing",
    "mapping",
    "normalizing",
    "persisting",
    "detecting",
  ];
  const stuck = await db
    .select()
    .from(fwaIngestJobs)
    .where(inArray(fwaIngestJobs.status, NON_TERMINAL));
  let resumed = 0;
  let failed = 0;
  for (const job of stuck) {
    const fp = job.sourceFilePath;
    let exists = false;
    if (fp) {
      try {
        await fsp.access(fp);
        exists = true;
      } catch {
        exists = false;
      }
    }
    if (exists && fp && job.sourceFileName) {
      pendingSources.set(job.id, { filePath: fp, fileName: job.sourceFileName });
      await updateJob(job.id, { status: "queued", currentStage: "queued (resumed)", progressPct: 0 });
      // Honor the persisted two-phase intent: if the original caller asked
      // for mapping confirmation we must re-arm that pause on recovery,
      // otherwise a crash before the pause point would let the worker run
      // straight through detection on resume, violating the contract.
      const persistedOverrides = job.columnMapping?.overrides;
      setImmediate(() => {
        runJob(job.id, {
          skipRagLlm: job.skipRagLlm ?? false,
          mappingOverrides: persistedOverrides,
          requireConfirmation: job.requireConfirmation ?? false,
        }).catch((err) => {
          console.error(`[FwaIngest] resumed job ${job.id} crashed:`, err);
        });
      });
      resumed++;
    } else {
      await appendError(job.id, {
        stage: "recover",
        message: "process restarted before job completed and staged source file is no longer available",
      });
      await updateJob(job.id, {
        status: "failed",
        currentStage: "failed (recovery)",
        errorMessage: "Job interrupted by process restart and staged source file is missing",
        completedAt: new Date(),
      });
      failed++;
    }
  }
  if (resumed + failed > 0) {
    console.log(`[FwaIngest] recoverInFlightJobs: resumed=${resumed} failed=${failed}`);
  }
  return { resumed, failed };
}

type JobUpdate = Partial<InsertFwaIngestJob>;

async function updateJob(jobId: string, patch: JobUpdate): Promise<void> {
  await db.update(fwaIngestJobs).set({ ...patch, updatedAt: new Date() }).where(eq(fwaIngestJobs.id, jobId));
}

type ErrorLogEntry = { rowIndex?: number; stage: string; message: string; at: string };

async function appendError(jobId: string, entry: { rowIndex?: number; stage: string; message: string }) {
  try {
    const [job] = await db.select({ errorLog: fwaIngestJobs.errorLog }).from(fwaIngestJobs).where(eq(fwaIngestJobs.id, jobId)).limit(1);
    const list: ErrorLogEntry[] = job?.errorLog ?? [];
    list.push({ ...entry, at: new Date().toISOString() });
    await db.update(fwaIngestJobs).set({ errorLog: list, updatedAt: new Date() }).where(eq(fwaIngestJobs.id, jobId));
  } catch (e) {
    console.warn("[FwaIngest] failed to append error log entry", e);
  }
}

async function cleanupSource(jobId: string): Promise<void> {
  const entry = pendingSources.get(jobId);
  pendingSources.delete(jobId);
  if (!entry) return;
  const filePath = entry.filePath;
  // Only unlink files inside our managed stage directory — never delete
  // arbitrary caller-provided paths outside it.
  if (!path.resolve(filePath).startsWith(path.resolve(INGEST_STAGE_DIR))) return;
  try {
    await fsp.unlink(filePath);
  } catch (err) {
    console.warn(`[FwaIngest] failed to unlink staged source ${filePath}:`, err);
  }
}

async function runJob(jobId: string, opts: { skipRagLlm: boolean; mappingOverrides?: Record<string, string>; requireConfirmation?: boolean }) {
  if (runningJobs.has(jobId)) return;
  runningJobs.add(jobId);
  const t0 = Date.now();
  try {
    const entry = pendingSources.get(jobId);
    if (!entry) throw new Error("staged source path missing");

    await updateJob(jobId, { status: "parsing", currentStage: "parsing", progressPct: 5, startedAt: new Date() });

    // Build a streaming reader from the staged file. CSV streams line-by-line;
    // Excel/JSON load whole-document via their respective libraries (format
    // limitation) but are read directly from disk, never via in-memory buffer.
    const reader = await buildSourceReader(entry.filePath, entry.fileName);
    const totalRows = reader.totalRows;
    if (totalRows === 0) throw new Error("source contains no rows");

    // Sample first 5 rows for column-mapping (LLM/heuristic).
    const sampleRows = await sampleReader(reader, 5);

    await updateJob(jobId, {
      status: "mapping",
      currentStage: "mapping",
      progressPct: 15,
      detectedHeaders: reader.headers,
      totalRows,
      rowsParsed: totalRows,
    });

    const mapping = await autoMapColumns(reader.headers, sampleRows);
    if (opts.mappingOverrides) {
      mapping.mappings = mapping.mappings.map((m) =>
        opts.mappingOverrides![m.schemaField]
          ? { ...m, sourceColumn: opts.mappingOverrides![m.schemaField], confidence: 100, reason: "manual override", needsConfirmation: false }
          : m
      );
    }
    await updateJob(jobId, {
      columnMapping: { ...mapping, autoMapped: true, overrides: opts.mappingOverrides },
    });

    // Two-phase ingestion: when the caller asked for mapping confirmation,
    // pause here. The job is now in "awaiting_confirmation" with the inferred
    // (and override-applied) mapping persisted on the row, ready for the
    // caller to GET the job, review, and POST /confirm with optional further
    // overrides to resume processing. Without this branch the worker would
    // proceed straight into normalization → detection.
    if (opts.requireConfirmation) {
      await updateJob(jobId, {
        status: "awaiting_confirmation",
        currentStage: "awaiting_confirmation",
        progressPct: 20,
      });
      console.log(`[FwaIngest] job ${jobId} paused for mapping confirmation`);
      return;
    }

    await updateJob(jobId, { status: "normalizing", currentStage: "normalizing", progressPct: 25 });

    const summaryAgg = {
      riskBuckets: { critical: 0, high: 0, medium: 0, low: 0 },
      enginesRun: { rule: 0, statistical: 0, unsupervised: 0, ragLlm: 0, semantic: 0 },
      enginesSkipped: { rule: 0, statistical: 0, unsupervised: 0, ragLlm: 0, semantic: 0 },
      compositeSum: 0,
      compositeCount: 0,
      reasonCounts: new Map<string, number>(),
    };

    let normalized = 0;
    let persisted = 0;
    let detected = 0;
    let skipped = 0;
    let failed = 0;
    let i = -1;

    // Stream through the source one row at a time. We never materialize the
    // full row set in memory; for CSV this is true streaming, for Excel/JSON
    // the iterator yields from the parsed array (library constraint).
    for await (const raw of reader.rows()) {
      i++;
      try {
        const norm = normalizeRow(raw, mapping, i);
        normalized++;
        if (norm.status === "invalid") {
          skipped++;
          const skipRow: InsertFwaIngestRow = {
            jobId,
            rowIndex: i,
            rawData: raw,
            normalizedClaim: norm.normalized as Record<string, any>,
            claimNumber: norm.normalized.claimNumber,
            status: "skipped",
            missingFields: norm.missingFields,
            ineligibleEngines: norm.ineligibleEngines,
            errorMessage: `Skipped — missing required fields: ${norm.missingFields.join(", ")}`,
          };
          await db.insert(fwaIngestRows).values(skipRow);
          await appendError(jobId, { rowIndex: i, stage: "normalize", message: `missing ${norm.missingFields.join(",")}` });
        } else {
          // Persist claim (required-field invariants already satisfied).
          const persistedClaim = await persistClaim(norm.normalized);
          persisted++;

          const claimInput: AnalyzedClaimData = {
            id: persistedClaim.claimId,
            claimNumber: persistedClaim.claimNumber,
            providerId: norm.normalized.providerId!,
            memberId: norm.normalized.memberId!,
            practitionerId: norm.normalized.practitionerId,
            specialty: norm.normalized.specialty,
            city: norm.normalized.city,
            providerType: norm.normalized.providerType,
            unitPrice: norm.normalized.amount,
            amount: norm.normalized.amount,
            quantity: norm.normalized.quantity ?? 1,
            primaryDiagnosis: norm.normalized.primaryDiagnosis,
            cptCodes: norm.normalized.cptCodes,
            description: norm.normalized.description,
            claimType: norm.normalized.claimType,
            lengthOfStay: norm.normalized.lengthOfStay,
            status: "pending",
            isPreAuthorized: norm.normalized.isPreAuthorized ?? false,
          };

          const outcome = await runFiveEngines(claimInput, norm.ineligibleEngines, { skipRagLlm: opts.skipRagLlm });
          await persistDetection(persistedClaim.claimNumber, persistedClaim.claimId, norm.normalized.providerId, norm.normalized.memberId, outcome);
          detected++;

          summaryAgg.riskBuckets[outcome.compositeRiskLevel]++;
          summaryAgg.compositeSum += outcome.compositeScore;
          summaryAgg.compositeCount++;
          const ranSet = new Set<EngineName>(outcome.enginesRun);
          if (ranSet.has("rule_engine")) summaryAgg.enginesRun.rule++; else summaryAgg.enginesSkipped.rule++;
          if (ranSet.has("statistical_learning")) summaryAgg.enginesRun.statistical++; else summaryAgg.enginesSkipped.statistical++;
          if (ranSet.has("unsupervised_learning")) summaryAgg.enginesRun.unsupervised++; else summaryAgg.enginesSkipped.unsupervised++;
          if (ranSet.has("rag_llm")) summaryAgg.enginesRun.ragLlm++; else summaryAgg.enginesSkipped.ragLlm++;
          if (ranSet.has("semantic_validation")) summaryAgg.enginesRun.semantic++; else summaryAgg.enginesSkipped.semantic++;
          for (const reason of outcome.enginesSkipped) {
            const k = `${reason.engine}: ${reason.reason}`;
            summaryAgg.reasonCounts.set(k, (summaryAgg.reasonCounts.get(k) || 0) + 1);
          }

          const detectionRow: InsertFwaIngestRow = {
            jobId,
            rowIndex: i,
            rawData: raw,
            normalizedClaim: norm.normalized as Record<string, any>,
            claimNumber: persistedClaim.claimNumber,
            claimId: persistedClaim.claimId,
            status: norm.status === "partial" ? "partial" : "completed",
            missingFields: norm.missingFields,
            ineligibleEngines: outcome.enginesSkipped,
            detection: {
              compositeScore: outcome.compositeScore,
              compositeRiskLevel: outcome.compositeRiskLevel,
              ruleEngineScore: outcome.ruleEngineScore,
              statisticalScore: outcome.statisticalScore,
              unsupervisedScore: outcome.unsupervisedScore,
              ragLlmScore: outcome.ragLlmScore,
              semanticScore: outcome.semanticScore,
              semanticFindings: outcome.semanticFindings,
              primaryDetectionMethod: outcome.primaryDetectionMethod,
              detectionSummary: outcome.detectionSummary,
              recommendedAction: outcome.recommendedAction,
              enginesRun: outcome.enginesRun,
              enginesSkipped: outcome.enginesSkipped,
            },
            processingTimeMs: outcome.processingTimeMs,
          };
          await db.insert(fwaIngestRows).values(detectionRow);
        }
      } catch (rowErr: unknown) {
        failed++;
        const msg = rowErr instanceof Error ? rowErr.message : String(rowErr);
        try {
          await db.insert(fwaIngestRows).values({
            jobId,
            rowIndex: i,
            rawData: raw,
            status: "failed",
            errorMessage: msg,
          });
        } catch {
          // already counted as failed
        }
        await appendError(jobId, { rowIndex: i, stage: "process", message: msg });
      }

      // throttle progress writes (every 5 rows or last row)
      const denom = totalRows > 0 ? totalRows : 1;
      if ((i + 1) % 5 === 0 || i === totalRows - 1) {
        const pct = 25 + Math.round(((i + 1) / denom) * 70);
        await updateJob(jobId, {
          status: "detecting",
          currentStage: `detecting (${i + 1}/${totalRows})`,
          progressPct: Math.min(95, pct),
          rowsNormalized: normalized,
          rowsPersisted: persisted,
          rowsDetected: detected,
          rowsSkipped: skipped,
          rowsFailed: failed,
        });
      }
    }

    const durationMs = Date.now() - t0;
    const topReasons = Array.from(summaryAgg.reasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `${k} (${v})`);
    const summary = {
      durationMs,
      riskBuckets: summaryAgg.riskBuckets,
      enginesRun: summaryAgg.enginesRun,
      enginesSkipped: summaryAgg.enginesSkipped,
      avgCompositeScore: summaryAgg.compositeCount > 0 ? Math.round((summaryAgg.compositeSum / summaryAgg.compositeCount) * 100) / 100 : 0,
      topReasons,
    };

    await updateJob(jobId, {
      status: "completed",
      currentStage: "completed",
      progressPct: 100,
      completedAt: new Date(),
      rowsNormalized: normalized,
      rowsPersisted: persisted,
      rowsDetected: detected,
      rowsSkipped: skipped,
      rowsFailed: failed,
      summary,
    });

    await cleanupSource(jobId);
    ingestionEvents.emit("ingest.completed", { jobId, summary, totalRows, detected, skipped, failed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[FwaIngest] job ${jobId} failed:`, msg);
    await updateJob(jobId, {
      status: "failed",
      currentStage: "failed",
      completedAt: new Date(),
      errorMessage: msg,
    });
    await appendError(jobId, { stage: "job", message: msg });
    await cleanupSource(jobId);
    ingestionEvents.emit("ingest.failed", { jobId, error: msg });
  } finally {
    runningJobs.delete(jobId);
  }
}

/**
 * Resume a job that is paused at status="awaiting_confirmation". Optionally
 * applies additional mappingOverrides on top of the previously inferred
 * mapping, then re-invokes the worker which will skip straight past the
 * pause check and proceed into normalization → detection.
 *
 * Returns the updated job row, or null if the job id is unknown. Throws
 * with a clear message when the job is not in a confirmable state.
 */
export async function resumeIngestionJob(
  jobId: string,
  opts: { mappingOverrides?: Record<string, string>; skipRagLlm?: boolean } = {}
): Promise<FwaIngestJob | null> {
  const [job] = await db.select().from(fwaIngestJobs).where(eq(fwaIngestJobs.id, jobId)).limit(1);
  if (!job) return null;
  if (job.status !== "awaiting_confirmation") {
    throw new Error(`job ${jobId} is in status "${job.status}" — only "awaiting_confirmation" jobs can be confirmed`);
  }
  const fp = job.sourceFilePath;
  if (!fp) throw new Error(`job ${jobId} has no staged source file path`);
  try {
    await fsp.access(fp);
  } catch {
    throw new Error(`staged source file for job ${jobId} is missing — cannot resume`);
  }
  // Merge any newly-supplied overrides into the persisted mapping so the
  // worker sees the final intent. We pass them through `runJob` again so the
  // existing override-application code path runs uniformly.
  const merged: Record<string, string> = { ...(job.columnMapping?.overrides || {}), ...(opts.mappingOverrides || {}) };
  pendingSources.set(job.id, { filePath: fp, fileName: job.sourceFileName || "upload" });
  // Clear the persisted requireConfirmation flag when the caller confirms,
  // so a subsequent crash/restart recovery resumes straight into normalization
  // instead of pausing again at awaiting_confirmation.
  const confirmedSkipRagLlm = opts.skipRagLlm ?? job.skipRagLlm ?? false;
  await updateJob(jobId, {
    status: "queued",
    currentStage: "queued (confirmed)",
    progressPct: 0,
    requireConfirmation: false,
    skipRagLlm: confirmedSkipRagLlm,
  });
  setImmediate(() => {
    runJob(jobId, {
      skipRagLlm: confirmedSkipRagLlm,
      mappingOverrides: merged,
      // requireConfirmation stays false here so the worker proceeds end to end
    }).catch((err) => {
      console.error(`[FwaIngest] resumed job ${jobId} crashed:`, err);
    });
  });
  const [updated] = await db.select().from(fwaIngestJobs).where(eq(fwaIngestJobs.id, jobId)).limit(1);
  return updated || null;
}

export async function getJobStatus(jobId: string): Promise<FwaIngestJob | null> {
  const [job] = await db.select().from(fwaIngestJobs).where(eq(fwaIngestJobs.id, jobId)).limit(1);
  return job || null;
}

/**
 * Per-row evidence payload returned alongside ingest rows. Mirrors the
 * five-engine fields stored in fwa_detection_results so callers of
 * GET /api/fwa/ingest/:jobId/results receive the full detection evidence
 * inline rather than having to make a second hop per claim.
 */
export type FwaIngestRowEvidence = {
  ruleEngine: { score: number | null; findings: unknown };
  statistical: { score: number | null; findings: unknown };
  unsupervised: { score: number | null; findings: unknown };
  ragLlm: { score: number | null; findings: unknown };
  semantic: { score: number | null; findings: unknown };
  primaryDetectionMethod: string | null;
  detectionSummary: string | null;
  recommendedAction: string | null;
  analyzedAt: Date | null;
};

export type FwaIngestRowWithEvidence = FwaIngestRow & {
  detectionEvidence: FwaIngestRowEvidence | null;
};

export async function getJobResults(
  jobId: string,
  opts: { limit?: number; offset?: number; status?: string } = {}
): Promise<{ rows: FwaIngestRowWithEvidence[]; total: number }> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 1000);
  const offset = Math.max(opts.offset ?? 0, 0);
  // Honor the optional status filter (e.g. "completed", "partial", "skipped",
  // "failed") so callers can paginate within a single status bucket without
  // pulling the whole job. Use COUNT(*) for total — selecting all ids for the
  // length is O(rows) and not scalable for large jobs.
  const where = opts.status
    ? and(eq(fwaIngestRows.jobId, jobId), eq(fwaIngestRows.status, opts.status))
    : eq(fwaIngestRows.jobId, jobId);
  const rows = await db
    .select()
    .from(fwaIngestRows)
    .where(where)
    .orderBy(asc(fwaIngestRows.rowIndex))
    .limit(limit)
    .offset(offset);
  const [{ total }] = await db
    .select({ total: count() })
    .from(fwaIngestRows)
    .where(where);

  // Enrich the page with per-engine evidence by joining (in a second query,
  // to avoid widening the JSON payload across the rows JOIN) against
  // fwa_detection_results on claim_id. Only completed/partial rows have a
  // claimId — skipped/invalid rows yield evidence: null. We keep this
  // explicitly in the service so the API layer doesn't have to know about
  // detection-results storage.
  const claimIds = rows.map((r) => r.claimId).filter((x): x is string => !!x);
  let evidenceByClaimId = new Map<string, FwaIngestRowEvidence>();
  if (claimIds.length > 0) {
    const detections = await db
      .select({
        claimId: fwaDetectionResults.claimId,
        ruleEngineScore: fwaDetectionResults.ruleEngineScore,
        ruleEngineFindings: fwaDetectionResults.ruleEngineFindings,
        statisticalScore: fwaDetectionResults.statisticalScore,
        statisticalFindings: fwaDetectionResults.statisticalFindings,
        unsupervisedScore: fwaDetectionResults.unsupervisedScore,
        unsupervisedFindings: fwaDetectionResults.unsupervisedFindings,
        ragLlmScore: fwaDetectionResults.ragLlmScore,
        ragLlmFindings: fwaDetectionResults.ragLlmFindings,
        semanticScore: fwaDetectionResults.semanticScore,
        semanticFindings: fwaDetectionResults.semanticFindings,
        primaryDetectionMethod: fwaDetectionResults.primaryDetectionMethod,
        detectionSummary: fwaDetectionResults.detectionSummary,
        recommendedAction: fwaDetectionResults.recommendedAction,
        analyzedAt: fwaDetectionResults.analyzedAt,
      })
      .from(fwaDetectionResults)
      .where(inArray(fwaDetectionResults.claimId, claimIds));
    const num = (v: string | null | undefined): number | null =>
      v === null || v === undefined ? null : Number(v);
    evidenceByClaimId = new Map(
      detections.map((d) => [
        d.claimId,
        {
          ruleEngine: { score: num(d.ruleEngineScore), findings: d.ruleEngineFindings ?? null },
          statistical: { score: num(d.statisticalScore), findings: d.statisticalFindings ?? null },
          unsupervised: { score: num(d.unsupervisedScore), findings: d.unsupervisedFindings ?? null },
          ragLlm: { score: num(d.ragLlmScore), findings: d.ragLlmFindings ?? null },
          semantic: { score: num(d.semanticScore), findings: d.semanticFindings ?? null },
          primaryDetectionMethod: d.primaryDetectionMethod ?? null,
          detectionSummary: d.detectionSummary ?? null,
          recommendedAction: d.recommendedAction ?? null,
          analyzedAt: d.analyzedAt ?? null,
        },
      ])
    );
  }
  const enriched: FwaIngestRowWithEvidence[] = rows.map((r) => ({
    ...r,
    detectionEvidence: r.claimId ? evidenceByClaimId.get(r.claimId) ?? null : null,
  }));
  return { rows: enriched, total: Number(total) };
}

export async function listRecentJobs(limit = 25): Promise<FwaIngestJob[]> {
  const jobs = await db.select().from(fwaIngestJobs).orderBy(desc(fwaIngestJobs.createdAt)).limit(limit);
  return jobs;
}
