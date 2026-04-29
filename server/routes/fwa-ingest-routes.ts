import type { Express, Request, Response } from "express";
import multer from "multer";
import * as path from "path";
import * as os from "os";
import * as fsp from "fs/promises";
import { z } from "zod";
import {
  createIngestionJob,
  getJobStatus,
  getJobResults,
  listRecentJobs,
  ingestionEvents,
  resumeIngestionJob,
} from "../services/fwa-ingest-pipeline";

// Disk-backed staging for uploads. multer streams the request body to disk
// instead of buffering the whole file in memory, so very large files don't
// inflate process memory. The pipeline service references the file by path
// and unlinks it once the job reaches a terminal state.
const UPLOAD_STAGE_DIR = process.env.FWA_INGEST_STAGE_DIR
  || path.join(os.tmpdir(), "fwa-ingest-stage");

const uploadStorage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fsp.mkdir(UPLOAD_STAGE_DIR, { recursive: true });
      cb(null, UPLOAD_STAGE_DIR);
    } catch (err) {
      cb(err as Error, UPLOAD_STAGE_DIR);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".dat";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

// 1 GiB cap. The pipeline streams CSV/TSV row-by-row and reads Excel/JSON
// directly from disk, so this limit is bounded by disk space rather than RAM.
const MAX_UPLOAD_BYTES = Number(process.env.FWA_INGEST_MAX_UPLOAD_BYTES || 1024 * 1024 * 1024);

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

// Safely parse a value that may be either an object/array or a JSON-encoded
// string (which is what multipart form fields look like). Returns either the
// parsed value or a Zod issue so .superRefine can convert it into a clean
// 400 response — JSON.parse must NEVER throw out of a Zod transform/refine.
function parseMaybeJson<T>(v: unknown, ctx: z.RefinementCtx, label: string): T | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") return v as T;
  try {
    return JSON.parse(v) as T;
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} is not valid JSON`,
    });
    return z.NEVER as unknown as T;
  }
}

const ingestBodySchema = z.object({
  jobName: z.string().optional(),
  sourceType: z.string().optional(),
  // Use the same coerceBool helper as the confirm route so that "false",
  // "0", "no" all evaluate to false instead of being silently truthy.
  skipRagLlm: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => coerceFlexibleBool(v)),
  // When true, the worker pauses after auto-mapping at status
  // "awaiting_confirmation" so the caller can review the inferred mapping
  // and resume via POST /api/fwa/ingest/:jobId/confirm with optional
  // additional overrides. Default false preserves single-call auto-process.
  requireConfirmation: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => coerceFlexibleBool(v)),
  // Accept either a record object or a JSON-encoded string (multipart). We
  // use a transform-with-ctx so malformed JSON yields a clean Zod issue
  // (and therefore a 400 from safeParse) rather than throwing.
  mappingOverrides: z
    .union([z.record(z.string()), z.string()])
    .optional()
    .transform((v, ctx) => parseMaybeJson<Record<string, string>>(v, ctx, "mappingOverrides"))
    .pipe(z.record(z.string()).optional()),
  inlineRows: z
    .union([z.array(z.record(z.any())), z.string()])
    .optional()
    .transform((v, ctx) => parseMaybeJson<Array<Record<string, unknown>>>(v, ctx, "inlineRows"))
    .pipe(z.array(z.record(z.any())).optional()),
  inlineFileName: z.string().optional(),
});

// Body schema for POST /api/fwa/ingest/:jobId/confirm. Uses the same
// boolean-or-string union as the create route so that string forms like
// "false" / "0" are coerced correctly (Boolean("false") === true is the
// classic JS footgun we explicitly avoid here). Only fields that make sense
// at confirm time are accepted.
// Shared boolean coercion used by BOTH the create and confirm route bodies
// so the parsing semantics are identical and the JS `Boolean("false") === true`
// footgun cannot reappear in either path.
function coerceFlexibleBool(v: boolean | string | undefined): boolean | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "boolean") return v;
  const lower = v.toLowerCase();
  if (lower === "true" || lower === "1" || lower === "yes") return true;
  if (lower === "false" || lower === "0" || lower === "no" || lower === "") return false;
  // Unrecognized string — surface as undefined so the existing setting
  // wins, rather than silently treating it as truthy.
  return undefined;
}

const confirmBodySchema = z.object({
  mappingOverrides: z
    .union([z.record(z.string()), z.string()])
    .optional()
    .transform((v, ctx) => parseMaybeJson<Record<string, string>>(v, ctx, "mappingOverrides"))
    .pipe(z.record(z.string()).optional()),
  skipRagLlm: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => coerceFlexibleBool(v)),
});

export function registerFwaIngestRoutes(
  app: Express,
  handleRouteError: (res: Response, error: unknown, routePath: string, operation?: string) => void
) {
  // POST /api/fwa/ingest — accepts multipart file OR JSON body { inlineRows, inlineFileName }
  app.post(
    "/api/fwa/ingest",
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        const parsedBody = ingestBodySchema.safeParse(req.body || {});
        if (!parsedBody.success) {
          return res.status(400).json({ error: "invalid body", issues: parsedBody.error.flatten() });
        }
        const opts = parsedBody.data;

        // Build the request to the pipeline service. For uploads we pass the
        // staged file path (multer wrote it to disk). For inline JSON we
        // pass a small buffer that the pipeline immediately stages to disk.
        type CreateArgs = Parameters<typeof createIngestionJob>[0];
        const createArgs: CreateArgs = {
          fileName: "upload.csv",
          jobName: opts.jobName,
          sourceType: opts.sourceType || (req.file ? "file_upload" : "inline"),
          createdBy: ((req as Request & { user?: { username?: string } }).user?.username) || "system",
          skipRagLlm: opts.skipRagLlm ?? false,
          mappingOverrides: opts.mappingOverrides,
          requireConfirmation: opts.requireConfirmation ?? false,
        };

        if (req.file) {
          createArgs.filePath = req.file.path;
          createArgs.fileName = req.file.originalname || "upload.csv";
          createArgs.fileSizeBytes = req.file.size;
        } else if (opts.inlineRows) {
          const rows = typeof opts.inlineRows === "string" ? JSON.parse(opts.inlineRows) : opts.inlineRows;
          createArgs.buffer = Buffer.from(JSON.stringify(rows), "utf-8");
          createArgs.fileName = opts.inlineFileName || "inline.json";
        } else {
          return res.status(400).json({
            error: "missing file. Provide multipart 'file' (xlsx/csv/json) OR JSON body 'inlineRows'.",
          });
        }

        const job = await createIngestionJob(createArgs);

        return res.status(202).json({
          jobId: job.id,
          status: job.status,
          statusUrl: `/api/fwa/ingest/${job.id}`,
          resultsUrl: `/api/fwa/ingest/${job.id}/results`,
        });
      } catch (err) {
        handleRouteError(res, err, "/api/fwa/ingest", "create ingest job");
      }
    }
  );

  // POST /api/fwa/ingest/:jobId/confirm — resume a paused job after the
  // caller has reviewed the auto-mapping. Optional body field
  // `mappingOverrides` (object: { schemaField: sourceColumn }) is merged
  // with any overrides supplied at job creation. Optional `skipRagLlm`
  // overrides the original setting at confirmation time.
  app.post("/api/fwa/ingest/:jobId/confirm", async (req: Request, res: Response) => {
    try {
      const parsed = confirmBodySchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: "invalid body", issues: parsed.error.flatten() });
      }
      const { mappingOverrides: overrides, skipRagLlm } = parsed.data;
      const job = await resumeIngestionJob(req.params.jobId, { mappingOverrides: overrides, skipRagLlm });
      if (!job) return res.status(404).json({ error: "job not found" });
      return res.status(202).json({
        jobId: job.id,
        status: job.status,
        statusUrl: `/api/fwa/ingest/${job.id}`,
        resultsUrl: `/api/fwa/ingest/${job.id}/results`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Confirmation errors are typically caller-facing (wrong status, missing
      // file, etc.) — return them as 409 so clients can react cleanly rather
      // than a generic 500. Genuine server faults still bubble through.
      if (/awaiting_confirmation|missing|no staged source/i.test(msg)) {
        return res.status(409).json({ error: msg });
      }
      handleRouteError(res, err, "/api/fwa/ingest/:jobId/confirm", "confirm ingest job");
    }
  });

  // GET /api/fwa/ingest — list recent jobs
  app.get("/api/fwa/ingest", async (req: Request, res: Response) => {
    try {
      const limit = Math.min(Math.max(parseInt(String(req.query.limit || "25"), 10) || 25, 1), 200);
      const jobs = await listRecentJobs(limit);
      res.json({ jobs });
    } catch (err) {
      handleRouteError(res, err, "/api/fwa/ingest", "list ingest jobs");
    }
  });

  // GET /api/fwa/ingest/:jobId — job status / progress / summary
  app.get("/api/fwa/ingest/:jobId", async (req: Request, res: Response) => {
    try {
      const job = await getJobStatus(req.params.jobId);
      if (!job) return res.status(404).json({ error: "job not found" });
      res.json(job);
    } catch (err) {
      handleRouteError(res, err, "/api/fwa/ingest/:jobId", "get ingest job");
    }
  });

  // GET /api/fwa/ingest/:jobId/results — paginated per-row results
  app.get("/api/fwa/ingest/:jobId/results", async (req: Request, res: Response) => {
    try {
      const limit = Math.min(Math.max(parseInt(String(req.query.limit || "100"), 10) || 100, 1), 1000);
      const offset = Math.max(parseInt(String(req.query.offset || "0"), 10) || 0, 0);
      const status = (req.query.status as string) || undefined;
      const job = await getJobStatus(req.params.jobId);
      if (!job) return res.status(404).json({ error: "job not found" });
      const { rows, total } = await getJobResults(req.params.jobId, { limit, offset, status });
      res.json({
        jobId: job.id,
        status: job.status,
        progressPct: job.progressPct,
        summary: job.summary,
        total,
        limit,
        offset,
        rows,
      });
    } catch (err) {
      handleRouteError(res, err, "/api/fwa/ingest/:jobId/results", "get ingest job results");
    }
  });

  // Logging hook for downstream consumers (test-case generator, detection page, high-risk recompute)
  ingestionEvents.on("ingest.completed", (payload) => {
    console.log(
      `[FwaIngest] job ${payload.jobId} completed — detected=${payload.detected}, skipped=${payload.skipped}, failed=${payload.failed}`
    );
  });
  ingestionEvents.on("ingest.failed", (payload) => {
    console.warn(`[FwaIngest] job ${payload.jobId} failed: ${payload.error}`);
  });
}
