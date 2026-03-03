import { EventEmitter } from "events";
import { sql } from "drizzle-orm";
import { db } from "../db";
import {
  documentIngestionService,
  type DocumentUploadRequest,
  type DocumentUploadResult,
} from "./document-ingestion-service";

type UploadJobStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "completed_with_errors"
  | "failed";

type UploadJobItemStatus = "queued" | "in_progress" | "completed" | "failed";

type ClaimedJobItem = {
  id: string;
  jobId: string;
  documentId: string;
  attempts: number;
  maxAttempts: number;
  originalFilename: string;
};

export type UploadJobItemSummary = {
  id: string;
  documentId: string;
  originalFilename: string;
  title: string;
  category: string;
  sourceAuthority: string | null;
  status: UploadJobItemStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type UploadJobSummary = {
  id: string;
  status: UploadJobStatus;
  createdBy: string | null;
  totalFiles: number;
  queuedFiles: number;
  inProgressFiles: number;
  completedFiles: number;
  failedFiles: number;
  progressPercent: number;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string | null;
  items?: UploadJobItemSummary[];
};

export type EnqueueBatchResult = {
  jobId: string;
  status: UploadJobStatus;
  totalFiles: number;
  queuedFiles: number;
  progressPercent: number;
  documents: DocumentUploadResult[];
  items: Array<{
    jobItemId: string;
    documentId: string;
    originalFilename: string;
    title: string;
    status: UploadJobItemStatus;
  }>;
  enqueueMs: number;
};

export type RetryFailedResult = {
  jobId: string;
  retriedItems: number;
};

const POLL_INTERVAL_MS = 1000;
const DEFAULT_WORKER_CONCURRENCY = 3;
const MAX_BACKOFF_SECONDS = 4 * 60;

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number.parseInt(value, 10) || 0;
  return 0;
}

function asJsonObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toIsoString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function computeProgressPercent(completedFiles: number, failedFiles: number, totalFiles: number): number {
  if (totalFiles <= 0) return 0;
  return Math.round(((completedFiles + failedFiles) / totalFiles) * 100);
}

function mapJobRow(row: any): UploadJobSummary {
  const totalFiles = asNumber(row.total_files);
  const completedFiles = asNumber(row.completed_files);
  const failedFiles = asNumber(row.failed_files);
  return {
    id: row.id,
    status: row.status as UploadJobStatus,
    createdBy: row.created_by ?? null,
    totalFiles,
    queuedFiles: asNumber(row.queued_files),
    inProgressFiles: asNumber(row.in_progress_files),
    completedFiles,
    failedFiles,
    progressPercent: computeProgressPercent(completedFiles, failedFiles, totalFiles),
    metadata: asJsonObject(row.metadata),
    createdAt: toIsoString(row.created_at),
    startedAt: toIsoString(row.started_at),
    completedAt: toIsoString(row.completed_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapItemRow(row: any): UploadJobItemSummary {
  return {
    id: row.id,
    documentId: row.document_id,
    originalFilename: row.original_filename,
    title: row.title,
    category: row.category,
    sourceAuthority: row.source_authority ?? null,
    status: row.status as UploadJobItemStatus,
    attempts: asNumber(row.attempts),
    maxAttempts: asNumber(row.max_attempts),
    lastError: row.last_error ?? null,
    startedAt: toIsoString(row.started_at),
    completedAt: toIsoString(row.completed_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function getWorkerConcurrency(): number {
  const parsed = Number.parseInt(process.env.KNOWLEDGE_UPLOAD_WORKER_CONCURRENCY || "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_WORKER_CONCURRENCY;
  return parsed;
}

function getBackoffSeconds(attempts: number): number {
  const seconds = 60 * Math.pow(2, Math.max(attempts - 1, 0));
  return Math.min(seconds, MAX_BACKOFF_SECONDS);
}

export class KnowledgeUploadQueueService {
  private running = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private tickInProgress = false;
  private activeWorkers = 0;
  private readonly concurrency = getWorkerConcurrency();
  private readonly progressEmitter = new EventEmitter();

  onJobProgress(jobId: string, listener: (data: any) => void): () => void {
    const eventName = `job:${jobId}`;
    this.progressEmitter.on(eventName, listener);
    return () => this.progressEmitter.removeListener(eventName, listener);
  }

  private emitJobProgress(jobId: string, summary: any) {
    this.progressEmitter.emit(`job:${jobId}`, summary);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.pollTimer = setInterval(() => {
      void this.tick();
    }, POLL_INTERVAL_MS);
    void this.tick();
    console.info(`[KnowledgeQueue] Worker started (concurrency=${this.concurrency})`);
  }

  stop(): void {
    this.running = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    console.info("[KnowledgeQueue] Worker stopped");
  }

  async isSchemaReady(): Promise<boolean> {
    const result = await db.execute(sql`
      SELECT
        to_regclass('public.knowledge_upload_jobs') IS NOT NULL AS jobs_ready,
        to_regclass('public.knowledge_upload_job_items') IS NOT NULL AS items_ready
    `);
    const row = (result.rows[0] ?? {}) as { jobs_ready?: unknown; items_ready?: unknown };
    const jobsReady = row.jobs_ready === true || row.jobs_ready === "t";
    const itemsReady = row.items_ready === true || row.items_ready === "t";
    return jobsReady && itemsReady;
  }

  async enqueueBatch(
    requests: DocumentUploadRequest[],
    createdBy?: string | null
  ): Promise<EnqueueBatchResult> {
    if (requests.length === 0) {
      throw new Error("At least one file is required");
    }

    const startedAt = Date.now();
    const jobInsert = await db.execute(sql`
      INSERT INTO knowledge_upload_jobs (
        status, created_by, total_files, queued_files, in_progress_files, completed_files, failed_files, metadata
      ) VALUES (
        'queued', ${createdBy || null}, ${requests.length}, ${requests.length}, 0, 0, 0, '{}'::jsonb
      )
      RETURNING id, status
    `);

    const job = jobInsert.rows[0] as { id: string; status: UploadJobStatus } | undefined;
    if (!job?.id) {
      throw new Error("Failed to create upload job");
    }

    const uploadedDocuments: DocumentUploadResult[] = [];
    const items: EnqueueBatchResult["items"] = [];

    try {
      for (const request of requests) {
        const uploadResult = await documentIngestionService.uploadDocument(request);
        uploadedDocuments.push(uploadResult);

        const itemResult = await db.execute(sql`
          INSERT INTO knowledge_upload_job_items (
            job_id, document_id, original_filename, title, category, source_authority,
            status, attempts, max_attempts, next_run_at
          ) VALUES (
            ${job.id},
            ${uploadResult.documentId},
            ${request.file.originalname},
            ${request.title},
            ${request.category},
            ${request.sourceAuthority || null},
            'queued',
            0,
            3,
            NOW()
          )
          RETURNING id, status
        `);

        const item = itemResult.rows[0] as { id: string; status: UploadJobItemStatus } | undefined;
        if (!item?.id) {
          throw new Error(`Failed to create queue item for ${request.file.originalname}`);
        }

        items.push({
          jobItemId: item.id,
          documentId: uploadResult.documentId,
          originalFilename: request.file.originalname,
          title: request.title,
          status: item.status,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Clean up already-uploaded documents (files + DB rows)
      for (const uploaded of uploadedDocuments) {
        try {
          await documentIngestionService.deleteDocument(uploaded.documentId);
        } catch (cleanupErr) {
          console.error(`[KnowledgeQueue] cleanup failed for doc=${uploaded.documentId}:`, cleanupErr);
        }
      }

      // Also delete any job items that were already inserted
      try {
        await db.execute(sql`
          DELETE FROM knowledge_upload_job_items WHERE job_id = ${job.id}
        `);
      } catch (itemCleanupErr) {
        console.error(`[KnowledgeQueue] cleanup of job items failed for job=${job.id}:`, itemCleanupErr);
      }

      await db.execute(sql`
        UPDATE knowledge_upload_jobs
        SET status = 'failed',
            failed_files = ${requests.length - uploadedDocuments.length},
            queued_files = 0,
            completed_at = NOW(),
            metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{enqueueError}', to_jsonb(${message}::text)),
            updated_at = NOW()
        WHERE id = ${job.id}
      `);
      throw error;
    }

    const enqueueMs = Date.now() - startedAt;
    console.info(
      `[KnowledgeQueue] enqueued job=${job.id} files=${requests.length} enqueue_ms=${enqueueMs}`
    );
    void this.tick();

    return {
      jobId: job.id,
      status: job.status,
      totalFiles: requests.length,
      queuedFiles: requests.length,
      progressPercent: 0,
      documents: uploadedDocuments,
      items,
      enqueueMs,
    };
  }

  async enqueueSingle(
    request: DocumentUploadRequest,
    createdBy?: string | null
  ): Promise<EnqueueBatchResult & { jobItemId: string }> {
    const result = await this.enqueueBatch([request], createdBy);
    return {
      ...result,
      jobItemId: result.items[0].jobItemId,
    };
  }

  async getJob(jobId: string): Promise<UploadJobSummary | null> {
    const jobResult = await db.execute(sql`
      SELECT *
      FROM knowledge_upload_jobs
      WHERE id = ${jobId}
      LIMIT 1
    `);

    const jobRow = jobResult.rows[0];
    if (!jobRow) return null;

    const itemsResult = await db.execute(sql`
      SELECT *
      FROM knowledge_upload_job_items
      WHERE job_id = ${jobId}
      ORDER BY created_at ASC
    `);

    const job = mapJobRow(jobRow as any);
    job.items = (itemsResult.rows as any[]).map(mapItemRow);
    return job;
  }

  async listJobs(limit: number = 20, status?: UploadJobStatus): Promise<UploadJobSummary[]> {
    const normalizedLimit = Number.isFinite(limit)
      ? Math.max(1, Math.min(limit, 100))
      : 20;
    const query = status
      ? sql`
          SELECT *
          FROM knowledge_upload_jobs
          WHERE status = ${status}
          ORDER BY created_at DESC
          LIMIT ${normalizedLimit}
        `
      : sql`
          SELECT *
          FROM knowledge_upload_jobs
          ORDER BY created_at DESC
          LIMIT ${normalizedLimit}
        `;

    const result = await db.execute(query);
    return (result.rows as any[]).map(mapJobRow);
  }

  async retryFailedItems(jobId: string): Promise<RetryFailedResult> {
    const retries = await db.execute(sql`
      UPDATE knowledge_upload_job_items
      SET status = 'queued',
          attempts = 0,
          next_run_at = NOW(),
          last_error = NULL,
          started_at = NULL,
          completed_at = NULL,
          updated_at = NOW()
      WHERE job_id = ${jobId}
        AND status = 'failed'
      RETURNING id, document_id
    `);

    const retriedRows = retries.rows as Array<{ id: string; document_id: string }>;
    if (retriedRows.length > 0) {
      const documentIds = retriedRows.map((row) => row.document_id);
      await db.execute(sql`
        UPDATE knowledge_documents
        SET processing_status = 'pending',
            processing_error = NULL,
            chunk_count = 0,
            updated_at = NOW()
        WHERE id = ANY(${documentIds})
      `);
    }

    await db.execute(sql`
      UPDATE knowledge_upload_jobs
      SET status = 'queued',
          completed_at = NULL,
          updated_at = NOW()
      WHERE id = ${jobId}
    `);
    await this.refreshJob(jobId);
    if (retriedRows.length > 0) {
      void this.tick();
    }

    return {
      jobId,
      retriedItems: retriedRows.length,
    };
  }

  private async tick(): Promise<void> {
    if (!this.running || this.tickInProgress) return;
    this.tickInProgress = true;

    try {
      while (this.running && this.activeWorkers < this.concurrency) {
        const item = await this.claimNextItem();
        if (!item) break;

        this.activeWorkers += 1;
        void this.processClaimedItem(item).finally(async () => {
          this.activeWorkers -= 1;
          await this.tick();
        });
      }
    } catch (error) {
      this.handleWorkerError(error);
    } finally {
      this.tickInProgress = false;
    }
  }

  private handleWorkerError(error: unknown): void {
    const pgCode =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code || "")
        : "";

    if (pgCode === "42P01" || pgCode === "42704") {
      console.warn(
        "[KnowledgeQueue] Queue tables are unavailable. Apply migration 0006_knowledge_bulk_upload_queue.sql and restart to enable bulk processing."
      );
      this.stop();
      return;
    }

    console.error("[KnowledgeQueue] Worker loop error:", error);
  }

  private async claimNextItem(): Promise<ClaimedJobItem | null> {
    const claimResult = await db.execute(sql`
      WITH next_item AS (
        SELECT i.id
        FROM knowledge_upload_job_items i
        JOIN knowledge_upload_jobs j ON j.id = i.job_id
        WHERE i.status = 'queued'
          AND i.next_run_at <= NOW()
          AND j.status IN ('queued', 'in_progress')
        ORDER BY i.created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE knowledge_upload_job_items i
      SET status = 'in_progress',
          attempts = i.attempts + 1,
          started_at = COALESCE(i.started_at, NOW()),
          updated_at = NOW()
      FROM next_item
      WHERE i.id = next_item.id
      RETURNING i.id, i.job_id, i.document_id, i.attempts, i.max_attempts, i.original_filename
    `);

    const row = claimResult.rows[0] as any;
    if (!row) return null;

    await db.execute(sql`
      UPDATE knowledge_upload_jobs
      SET status = 'in_progress',
          started_at = COALESCE(started_at, NOW()),
          updated_at = NOW()
      WHERE id = ${row.job_id}
        AND status = 'queued'
    `);

    return {
      id: row.id,
      jobId: row.job_id,
      documentId: row.document_id,
      attempts: asNumber(row.attempts),
      maxAttempts: asNumber(row.max_attempts),
      originalFilename: row.original_filename,
    };
  }

  private async processClaimedItem(item: ClaimedJobItem): Promise<void> {
    const processStart = Date.now();

    try {
      await documentIngestionService.processDocument(item.documentId);
      await db.execute(sql`
        UPDATE knowledge_upload_job_items
        SET status = 'completed',
            completed_at = NOW(),
            next_run_at = NOW(),
            last_error = NULL,
            updated_at = NOW()
        WHERE id = ${item.id}
      `);

      console.info(
        `[KnowledgeQueue] processed job=${item.jobId} item=${item.id} file="${item.originalFilename}" process_ms=${Date.now() - processStart}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const retryCount = item.attempts;

      if (item.attempts >= item.maxAttempts) {
        await db.execute(sql`
          UPDATE knowledge_upload_job_items
          SET status = 'failed',
              completed_at = NOW(),
              next_run_at = NOW(),
              last_error = ${errorMessage},
              updated_at = NOW()
          WHERE id = ${item.id}
        `);

        console.error(
          `[KnowledgeQueue] item failed permanently job=${item.jobId} item=${item.id} retry_count=${retryCount} error="${errorMessage}"`
        );
      } else {
        const backoffSeconds = getBackoffSeconds(item.attempts);
        await db.execute(sql`
          UPDATE knowledge_upload_job_items
          SET status = 'queued',
              next_run_at = NOW() + (${backoffSeconds} || ' seconds')::interval,
              last_error = ${errorMessage},
              updated_at = NOW()
          WHERE id = ${item.id}
        `);

        console.warn(
          `[KnowledgeQueue] retry scheduled job=${item.jobId} item=${item.id} retry_count=${retryCount} backoff_seconds=${backoffSeconds} error="${errorMessage}"`
        );
      }
    } finally {
      await this.refreshJob(item.jobId);
    }
  }

  private async refreshJob(jobId: string): Promise<void> {
    const countsResult = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total_files,
        COUNT(*) FILTER (WHERE status = 'queued')::int AS queued_files,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress_files,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_files,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_files
      FROM knowledge_upload_job_items
      WHERE job_id = ${jobId}
    `);

    const counts = (countsResult.rows[0] ?? {}) as Record<string, unknown>;
    const totalFiles = asNumber(counts.total_files);
    const queuedFiles = asNumber(counts.queued_files);
    const inProgressFiles = asNumber(counts.in_progress_files);
    const completedFiles = asNumber(counts.completed_files);
    const failedFiles = asNumber(counts.failed_files);

    let status: UploadJobStatus = "queued";
    const finishedFiles = completedFiles + failedFiles;
    if (totalFiles > 0 && finishedFiles >= totalFiles) {
      if (failedFiles === 0) {
        status = "completed";
      } else if (completedFiles > 0) {
        status = "completed_with_errors";
      } else {
        status = "failed";
      }
    } else if (inProgressFiles > 0 || completedFiles > 0 || failedFiles > 0) {
      status = "in_progress";
    }

    await db.execute(sql`
      UPDATE knowledge_upload_jobs
      SET status = ${status},
          total_files = ${totalFiles},
          queued_files = ${queuedFiles},
          in_progress_files = ${inProgressFiles},
          completed_files = ${completedFiles},
          failed_files = ${failedFiles},
          completed_at = CASE
            WHEN ${status} IN ('completed', 'completed_with_errors', 'failed') THEN COALESCE(completed_at, NOW())
            ELSE NULL
          END,
          updated_at = NOW()
      WHERE id = ${jobId}
    `);

    if (status === "completed" || status === "completed_with_errors" || status === "failed") {
      console.info(
        `[KnowledgeQueue] job complete job=${jobId} status=${status} completed=${completedFiles} failed=${failedFiles}`
      );
    }

    // Emit progress for SSE listeners
    const summary = await this.getJob(jobId);
    if (summary) {
      this.emitJobProgress(jobId, summary);
    }
  }
}

export const knowledgeUploadQueueService = new KnowledgeUploadQueueService();
