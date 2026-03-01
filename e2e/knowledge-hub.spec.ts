import { test, expect } from "@playwright/test";

test.describe("Knowledge Hub", () => {
  test("Knowledge Hub page loads with upload button and search input", async ({ page }) => {
    await page.goto("/fwa/knowledge-hub");

    await expect(page.getByTestId("page-knowledge-hub")).toBeVisible();
    await expect(page.getByTestId("button-upload-document")).toBeVisible();
    await expect(page.getByTestId("input-search-documents")).toBeVisible();

    await expect(page.getByText("Total Documents")).toBeVisible();
    await expect(page.getByText("Knowledge Chunks")).toBeVisible();
  });

  test("knowledge hub category filter narrows document list", async ({ page }) => {
    // Mock knowledge documents endpoint with different categories
    await page.route("**/api/knowledge-documents", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            documents: [
              {
                id: "doc-1",
                filename: "chi-policy.pdf",
                original_filename: "chi-policy.pdf",
                file_type: "pdf",
                category: "chi_mandatory_policy",
                title: "CHI Policy Manual",
                title_ar: null,
                description: null,
                source_authority: null,
                file_size: 1024,
                page_count: 10,
                processing_status: "completed",
                processing_error: null,
                chunk_count: 15,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              {
                id: "doc-2",
                filename: "formulary.pdf",
                original_filename: "formulary.pdf",
                file_type: "pdf",
                category: "drug_formulary",
                title: "Drug Formulary 2024",
                title_ar: null,
                description: null,
                source_authority: null,
                file_size: 2048,
                page_count: 20,
                processing_status: "completed",
                processing_error: null,
                chunk_count: 30,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              {
                id: "doc-3",
                filename: "moh-circular.pdf",
                original_filename: "moh-circular.pdf",
                file_type: "pdf",
                category: "resolution_circular",
                title: "MOH Circular 2024/15",
                title_ar: null,
                description: null,
                source_authority: null,
                file_size: 512,
                page_count: 3,
                processing_status: "completed",
                processing_error: null,
                chunk_count: 5,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
            pagination: { total: 3, limit: 50, offset: 0, hasMore: false },
          },
        }),
      });
    });

    // Mock stats endpoint
    await page.route("**/api/knowledge-documents/stats", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { total: 3, pending: 0, processing: 0, completed: 3, failed: 0, totalChunks: 50 },
        }),
      });
    });

    // Mock upload jobs endpoint
    await page.route("**/api/knowledge-documents/upload-jobs*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { jobs: [] },
        }),
      });
    });

    // Navigate to Knowledge Hub
    await page.goto("/fwa/knowledge-hub");

    // Verify all 3 documents are shown initially
    await expect(page.getByText("CHI Policy Manual")).toBeVisible();
    await expect(page.getByText("Drug Formulary 2024")).toBeVisible();
    await expect(page.getByText("MOH Circular 2024/15")).toBeVisible();

    // Click the category filter dropdown
    const categoryFilter = page.getByTestId("select-category-filter");
    await categoryFilter.click();

    // Select "CHI Mandatory Policy"
    await page.getByRole("option", { name: "CHI Mandatory Policy" }).click();

    // Verify only the CHI policy document is visible
    await expect(page.getByText("CHI Policy Manual")).toBeVisible();
    await expect(page.getByText("Drug Formulary 2024")).not.toBeVisible();
    await expect(page.getByText("MOH Circular 2024/15")).not.toBeVisible();
  });

  test("navigates to Knowledge Hub from FWA sidebar", async ({ page }) => {
    await page.goto("/fwa/dashboard");

    const navItem = page.getByTestId("nav-fwa-knowledge-hub");
    await expect(navItem).toBeVisible();
    await navItem.click();

    await expect(page).toHaveURL(/\/fwa\/knowledge-hub$/);
    await expect(page.getByTestId("page-knowledge-hub")).toBeVisible();
  });
});
