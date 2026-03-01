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

  test("chat response displays citation sources", async ({ page }) => {
    // Mock the conversations endpoint
    await page.route("**/api/chat/conversations", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "conv-test",
            sessionId: "sess-test",
            title: "Test",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "[]",
        });
      }
    });

    // Mock the chat message SSE endpoint to return content + sources + done
    await page.route("**/api/chat/conversations/*/messages", async (route) => {
      if (route.request().method() === "POST") {
        const body = [
          `data: ${JSON.stringify({ content: "According to the regulation [1], prior auth is required." })}\n\n`,
          `data: ${JSON.stringify({ sources: [{ index: 1, documentTitle: "CHI Policy v3.2", sectionTitle: "Prior Auth", pageNumber: 47, similarity: 0.92 }] })}\n\n`,
          `data: ${JSON.stringify({ done: true })}\n\n`,
        ].join("");
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
          body,
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "[]",
        });
      }
    });

    // Navigate to FWA dashboard (where chat FAB appears)
    await page.goto("/fwa/dashboard");

    // Click the chat FAB to open the panel
    const fab = page.getByTestId("button-chat-fab");
    await fab.click();

    // Wait for panel to open
    const panel = page.getByTestId("panel-chat");
    await expect(panel).toBeVisible();

    // Type a message in the chat input
    const input = page.getByTestId("input-chat-message");
    await input.fill("What is the prior auth policy?");
    await input.press("Enter");

    // Wait for the citation sources to appear
    await expect(page.getByText("Sources")).toBeVisible({ timeout: 5000 });

    // Verify citation content
    await expect(page.getByText("CHI Policy v3.2")).toBeVisible();
    await expect(page.getByText("p.47")).toBeVisible();
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
