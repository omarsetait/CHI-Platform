import { test, expect } from "@playwright/test";

type PillarJourney = {
  pillarId: "fwa" | "intelligence" | "business" | "members";
  homeCardTestId: string;
  expectedLandingPath: string;
  sidebarNavTestId: string;
  expectedSecondaryPath: string;
};

const journeys: PillarJourney[] = [
  {
    pillarId: "fwa",
    homeCardTestId: "card-module-audit-fwa",
    expectedLandingPath: "/fwa/dashboard",
    sidebarNavTestId: "nav-fwa-high-risk-entities",
    expectedSecondaryPath: "/fwa/high-risk-entities",
  },
  {
    pillarId: "intelligence",
    homeCardTestId: "card-module-daman-intelligence",
    expectedLandingPath: "/intelligence/dashboard",
    sidebarNavTestId: "nav-intelligence-rejection-patterns",
    expectedSecondaryPath: "/intelligence/rejection-patterns",
  },
  {
    pillarId: "business",
    homeCardTestId: "card-module-daman-business",
    expectedLandingPath: "/business/dashboard",
    sidebarNavTestId: "nav-business-employer-compliance",
    expectedSecondaryPath: "/business/employer-compliance",
  },
  {
    pillarId: "members",
    homeCardTestId: "card-module-daman-members",
    expectedLandingPath: "/members/dashboard",
    sidebarNavTestId: "nav-members-report-fraud",
    expectedSecondaryPath: "/members/report-fraud",
  },
];

test.describe("Four-pillar smoke journeys", () => {
  for (const journey of journeys) {
    test(`navigates ${journey.expectedLandingPath} and sidebar journey`, async ({ page }) => {
      await page.goto("/");

      await page.getByTestId(journey.homeCardTestId).click();
      await expect(page).toHaveURL(new RegExp(`${journey.expectedLandingPath}$`));
      await expect(page.getByTestId(`text-${journey.pillarId}-header-title`)).toBeVisible();

      await page.getByTestId(journey.sidebarNavTestId).click();
      await expect(page).toHaveURL(new RegExp(`${journey.expectedSecondaryPath}$`));
      await expect(page.getByTestId(`text-${journey.pillarId}-header-title`)).toBeVisible();
    });
  }
});

test.describe("Theme persistence", () => {
  test("persists theme across pillar navigation and reload", async ({ page }) => {
    await page.goto("/intelligence/dashboard");

    const themeToggle = page.getByTestId("button-theme-toggle");
    await expect(themeToggle).toBeVisible();

    const initialIsDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    await themeToggle.click();

    await expect
      .poll(async () => page.evaluate(() => document.documentElement.classList.contains("dark")))
      .toBe(!initialIsDark);

    const expectedTheme = !initialIsDark ? "dark" : "light";

    await page.goto("/business/dashboard");
    await expect(page.getByTestId("text-business-header-title")).toBeVisible();
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.classList.contains("dark")))
      .toBe(!initialIsDark);

    await page.reload();
    await expect(page.getByTestId("text-business-header-title")).toBeVisible();

    const persistedTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(persistedTheme).toBe(expectedTheme);
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.classList.contains("dark")))
      .toBe(!initialIsDark);
  });
});
