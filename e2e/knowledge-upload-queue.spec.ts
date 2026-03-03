import { test, expect } from "@playwright/test";

test.describe("Knowledge Upload Queue", () => {
  test("shows active upload job progress and retries failed files", async ({ page }) => {
    let retryCalled = false;

    await page.route("**/api/knowledge-documents", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            documents: [],
            pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
          },
        }),
      });
    });

    await page.route("**/api/knowledge-documents/stats", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { total: 0, pending: 0, processing: 0, completed: 0, failed: 0, totalChunks: 0 },
        }),
      });
    });

    await page.route("**/api/knowledge-documents/upload-jobs", async (route) => {
      if (route.request().method() !== "GET") {
        return route.continue();
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            jobs: [
              {
                id: "job-1",
                status: "completed_with_errors",
                createdBy: null,
                totalFiles: 3,
                queuedFiles: 0,
                inProgressFiles: 0,
                completedFiles: 2,
                failedFiles: 1,
                progressPercent: 100,
                metadata: {},
                createdAt: new Date().toISOString(),
                startedAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          },
        }),
      });
    });

    await page.route("**/api/knowledge-documents/upload-jobs/job-1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "job-1",
            status: "completed_with_errors",
            createdBy: null,
            totalFiles: 3,
            queuedFiles: 0,
            inProgressFiles: 0,
            completedFiles: 2,
            failedFiles: 1,
            progressPercent: 100,
            metadata: {},
            createdAt: new Date().toISOString(),
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: [
              {
                id: "item-1",
                documentId: "doc-1",
                originalFilename: "member-guide.pdf",
                title: "Member Guide",
                category: "other",
                sourceAuthority: null,
                status: "completed",
                attempts: 1,
                maxAttempts: 3,
                lastError: null,
                startedAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              {
                id: "item-2",
                documentId: "doc-2",
                originalFilename: "provider-policy.docx",
                title: "Provider Policy",
                category: "other",
                sourceAuthority: null,
                status: "failed",
                attempts: 3,
                maxAttempts: 3,
                lastError: "OCR extraction timeout",
                startedAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          },
        }),
      });
    });

    await page.route("**/api/knowledge-documents/upload-jobs/job-1/retry-failed", async (route) => {
      retryCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { jobId: "job-1", retriedItems: 1 },
        }),
      });
    });

    await page.goto("/fwa/knowledge-hub");

    await expect(page.getByTestId("card-upload-job-progress")).toBeVisible();
    await expect(page.getByTestId("card-upload-job-progress")).toContainText("Completed with Errors");
    await expect(page.getByTestId("card-upload-job-progress")).toContainText("OCR extraction timeout");

    await page.getByTestId("button-retry-failed-files").click();
    await expect.poll(() => retryCalled).toBe(true);
  });

  test("bulk upload button opens dialog and accepts multiple files", async ({ page }) => {
    // Mock required endpoints with empty data
    await page.route("**/api/knowledge-documents/stats", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { total: 0, pending: 0, processing: 0, completed: 0, failed: 0, totalChunks: 0 },
        }),
      });
    });

    await page.route("**/api/knowledge-documents", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            documents: [],
            pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
          },
        }),
      });
    });

    await page.route("**/api/knowledge-documents/upload-jobs", async (route) => {
      if (route.request().method() !== "GET") {
        return route.continue();
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { jobs: [] } }),
      });
    });

    await page.goto("/fwa/knowledge-hub");
    await page.waitForLoadState("networkidle");

    // Verify upload button exists and opens dialog
    const uploadBtn = page.getByTestId("button-upload-document");
    await expect(uploadBtn).toBeVisible();
    await uploadBtn.click();

    // Verify dialog is open with expected title and drop zone
    await expect(page.getByText("Upload Knowledge Document")).toBeVisible();
    await expect(page.getByText("Drag and drop your file here")).toBeVisible();

    // Verify the file input accepts multiple files
    const fileInput = page.getByTestId("input-file");
    await expect(fileInput).toHaveAttribute("multiple", "");

    // Verify category selector and submit button are present
    await expect(page.getByTestId("select-category")).toBeVisible();
    await expect(page.getByTestId("button-upload-submit")).toBeVisible();

    // Submit button should be disabled when no files are selected
    await expect(page.getByTestId("button-upload-submit")).toBeDisabled();

    // Select files via the input
    await fileInput.setInputFiles([
      { name: "report-a.txt", mimeType: "text/plain", buffer: Buffer.from("hello") },
      { name: "report-b.txt", mimeType: "text/plain", buffer: Buffer.from("world") },
    ]);

    // Verify both file names appear in the dialog
    await expect(page.getByText("report-a.txt")).toBeVisible();
    await expect(page.getByText("report-b.txt")).toBeVisible();
    await expect(page.getByText("2 files selected")).toBeVisible();

    // Submit should still be disabled until a category is selected
    await expect(page.getByTestId("button-upload-submit")).toBeDisabled();

    // Select a category
    await page.getByTestId("select-category").click();
    await page.getByRole("option", { name: "Other" }).click();

    // Now the submit button should be enabled
    await expect(page.getByTestId("button-upload-submit")).toBeEnabled();

    // Cancel the dialog to close it
    await page.getByTestId("button-cancel").click();
    await expect(page.getByText("Upload Knowledge Document")).not.toBeVisible();
  });

  test("submits multi-file upload batch and binds to returned job", async ({ page }) => {
    let activeJobId: string | null = null;

    await page.route("**/api/knowledge-documents", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            documents: [],
            pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
          },
        }),
      });
    });

    await page.route("**/api/knowledge-documents/stats", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { total: 0, pending: 0, processing: 0, completed: 0, failed: 0, totalChunks: 0 },
        }),
      });
    });

    await page.route("**/api/knowledge-documents/upload-batch", async (route) => {
      activeJobId = "job-queued-1";
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            jobId: activeJobId,
            status: "queued",
            totalFiles: 2,
            queuedFiles: 2,
            progressPercent: 0,
            uploaded: 2,
            documents: [],
            items: [],
            enqueueMs: 20,
          },
        }),
      });
    });

    await page.route("**/api/knowledge-documents/upload-jobs", async (route) => {
      if (route.request().method() !== "GET") {
        return route.continue();
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            jobs: activeJobId
              ? [
                  {
                    id: activeJobId,
                    status: "in_progress",
                    createdBy: null,
                    totalFiles: 2,
                    queuedFiles: 1,
                    inProgressFiles: 1,
                    completedFiles: 0,
                    failedFiles: 0,
                    progressPercent: 0,
                    metadata: {},
                    createdAt: new Date().toISOString(),
                    startedAt: new Date().toISOString(),
                    completedAt: null,
                    updatedAt: new Date().toISOString(),
                  },
                ]
              : [],
          },
        }),
      });
    });

    await page.route("**/api/knowledge-documents/upload-jobs/job-queued-1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "job-queued-1",
            status: "in_progress",
            createdBy: null,
            totalFiles: 2,
            queuedFiles: 1,
            inProgressFiles: 1,
            completedFiles: 0,
            failedFiles: 0,
            progressPercent: 0,
            metadata: {},
            createdAt: new Date().toISOString(),
            startedAt: new Date().toISOString(),
            completedAt: null,
            updatedAt: new Date().toISOString(),
            items: [
              {
                id: "item-a",
                documentId: "doc-a",
                originalFilename: "doc-a.txt",
                title: "doc-a",
                category: "other",
                sourceAuthority: null,
                status: "in_progress",
                attempts: 1,
                maxAttempts: 3,
                lastError: null,
                startedAt: new Date().toISOString(),
                completedAt: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              {
                id: "item-b",
                documentId: "doc-b",
                originalFilename: "doc-b.txt",
                title: "doc-b",
                category: "other",
                sourceAuthority: null,
                status: "queued",
                attempts: 0,
                maxAttempts: 3,
                lastError: null,
                startedAt: null,
                completedAt: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          },
        }),
      });
    });

    await page.goto("/fwa/knowledge-hub");
    await page.getByTestId("button-upload-document").click();
    await page.getByTestId("input-file").setInputFiles([
      { name: "doc-a.txt", mimeType: "text/plain", buffer: Buffer.from("alpha") },
      { name: "doc-b.txt", mimeType: "text/plain", buffer: Buffer.from("beta") },
    ]);

    await page.getByTestId("select-category").click();
    await page.getByRole("option", { name: "Other" }).click();
    await page.getByTestId("button-upload-submit").click();

    await expect(page.getByTestId("card-upload-job-progress")).toBeVisible();
    await expect(page.getByTestId("card-upload-job-progress")).toContainText("doc-a.txt");
    await expect(page.getByTestId("card-upload-job-progress")).toContainText("doc-b.txt");
  });
});
