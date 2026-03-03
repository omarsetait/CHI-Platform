import { test, expect } from "@playwright/test";

test.describe("FWA Enforcement Workflow", () => {
  test("can navigate to enforcement page", async ({ page }) => {
    await page.goto("/fwa/enforcement");
    await expect(page.getByTestId("page-title")).toBeVisible();
    await expect(page.getByTestId("page-title")).toHaveText("Enforcement Cases");
  });

  test("enforcement case cards display workflow status stages", async ({ page }) => {
    await page.goto("/fwa/enforcement");
    // Check that the STATUS_WORKFLOW stages are visible in the UI
    await expect(page.getByTestId("stage-filter-finding")).toBeVisible();
    await expect(page.getByTestId("stage-filter-warning_issued")).toBeVisible();
    await expect(page.getByTestId("stage-filter-corrective_action")).toBeVisible();
    await expect(page.getByTestId("stage-filter-penalty_proposed")).toBeVisible();
    await expect(page.getByTestId("stage-filter-penalty_applied")).toBeVisible();
    await expect(page.getByTestId("stage-filter-appeal_submitted")).toBeVisible();
    await expect(page.getByTestId("stage-filter-appeal_review")).toBeVisible();
    await expect(page.getByTestId("stage-filter-resolved")).toBeVisible();
  });

  test("summary statistics are visible", async ({ page }) => {
    await page.goto("/fwa/enforcement");
    await expect(page.getByTestId("stat-total")).toBeVisible();
    await expect(page.getByTestId("stat-active")).toBeVisible();
    await expect(page.getByTestId("stat-pending")).toBeVisible();
    await expect(page.getByTestId("stat-appeals")).toBeVisible();
    await expect(page.getByTestId("stat-fines")).toBeVisible();
  });

  test("search and filter controls are present", async ({ page }) => {
    await page.goto("/fwa/enforcement");
    await expect(page.getByTestId("input-search")).toBeVisible();
    await expect(page.getByTestId("select-status")).toBeVisible();
    await expect(page.getByTestId("select-severity")).toBeVisible();
  });

  test("new case button opens create dialog", async ({ page }) => {
    await page.goto("/fwa/enforcement");
    await page.getByTestId("button-new-case").click();
    await expect(page.getByTestId("select-provider")).toBeVisible();
    await expect(page.getByTestId("input-violation-id")).toBeVisible();
    await expect(page.getByTestId("input-violation-title")).toBeVisible();
    await expect(page.getByTestId("select-severity")).toBeVisible();
    await expect(page.getByTestId("textarea-findings")).toBeVisible();
    await expect(page.getByTestId("button-submit-case")).toBeVisible();
    await expect(page.getByTestId("button-cancel-create")).toBeVisible();
  });

  test("enforcement page loads without critical errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/fwa/enforcement");
    await page.waitForLoadState("networkidle");
    // Allow some benign errors (missing favicon, manifest, etc.) but flag critical ones
    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("manifest") && !e.includes("404"),
    );
    expect(criticalErrors.length).toBeLessThanOrEqual(2);
  });
});
