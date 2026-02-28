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

  test("navigates to Knowledge Hub from FWA sidebar", async ({ page }) => {
    await page.goto("/fwa/dashboard");

    const navItem = page.getByTestId("nav-fwa-knowledge-hub");
    await expect(navItem).toBeVisible();
    await navItem.click();

    await expect(page).toHaveURL(/\/fwa\/knowledge-hub$/);
    await expect(page.getByTestId("page-knowledge-hub")).toBeVisible();
  });
});
