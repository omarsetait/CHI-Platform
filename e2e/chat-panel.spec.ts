import { test, expect } from "@playwright/test";

test.describe("Daman AI chat", () => {
  test("chat FAB opens panel and displays starter questions", async ({ page }) => {
    await page.goto("/fwa/dashboard");

    const fab = page.getByTestId("button-chat-fab");
    await expect(fab).toBeVisible();

    await fab.click();

    const panel = page.getByTestId("panel-chat");
    await expect(panel).toBeVisible();

    await expect(page.getByTestId("button-chat-starter").first()).toBeVisible();
    await expect(page.getByTestId("input-chat-message")).toBeVisible();
    await expect(page.getByTestId("button-new-chat")).toBeVisible();
  });

  test("chat FAB appears on all pillar pages", async ({ page }) => {
    const pillarPages = [
      "/fwa/dashboard",
      "/intelligence/dashboard",
      "/business/dashboard",
      "/members/dashboard",
    ];

    for (const path of pillarPages) {
      await page.goto(path);
      await expect(page.getByTestId("button-chat-fab")).toBeVisible();
    }
  });
});
