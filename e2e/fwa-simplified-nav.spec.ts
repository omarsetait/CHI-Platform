import { test, expect } from "@playwright/test";

const expectedNavItems = [
  { testId: "nav-fwa-command-center", label: "Command Center" },
  { testId: "nav-fwa-high-risk-entities", label: "High-Risk Entities" },
  { testId: "nav-fwa-flagged-claims", label: "Flagged Claims" },
  { testId: "nav-fwa-online-listening", label: "Online Listening" },
  { testId: "nav-fwa-enforcement-&-compliance", label: "Enforcement & Compliance" },
  { testId: "nav-fwa-intelligence-reports", label: "Intelligence Reports" },
];

test.describe("FWA simplified navigation", () => {
  test("shows exactly 6 nav items in the sidebar", async ({ page }) => {
    await page.goto("/fwa/dashboard");
    for (const item of expectedNavItems) {
      await expect(page.getByTestId(item.testId)).toBeVisible();
    }
  });

  test("does NOT show old detection engine nav items", async ({ page }) => {
    await page.goto("/fwa/dashboard");
    await expect(page.getByTestId("nav-fwa-detection-engine")).not.toBeVisible();
    await expect(page.getByTestId("nav-fwa-rule-management-studio")).not.toBeVisible();
    await expect(page.getByTestId("nav-fwa-agent-orchestration")).not.toBeVisible();
    await expect(page.getByTestId("nav-fwa-unsupervised-lab")).not.toBeVisible();
    await expect(page.getByTestId("nav-fwa-settings")).not.toBeVisible();
  });
});
