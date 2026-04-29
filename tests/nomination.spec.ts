// tests/nomination.spec.ts
import { expect, type Page, test } from "@playwright/test";

const waitForHomePage = async (page: Page) => {
	await page.goto("/", { timeout: 10000 });
	await page.locator("#username").waitFor({ state: "visible", timeout: 10000 });
};

test.describe("Movie Nomination and Voting", () => {
	test.beforeEach(async ({ page }) => {
		await waitForHomePage(page);
		await page.fill("#username", "TestUser");
		await page.getByRole("button", { name: /Start.*Lounge/i }).click();
		await page.waitForURL(/\/lounge\/[A-Za-z0-9]+/);
	});

	test("should display AI Concierge prompt input", async ({ page }) => {
		await expect(page.locator("input[placeholder*='movie']")).toBeVisible();
		await expect(page.locator("text=Ask the AI Concierge")).toBeVisible();
	});

	test("should show Golden Tickets counter", async ({ page }) => {
		await expect(page.locator("text=/\\d+ tickets? left/")).toBeVisible();
	});

	test("should toggle pizza preference", async ({ page }) => {
		const pizzaButton = page.locator("text=Pizza");
		await pizzaButton.click();

		// Should toggle on (visual feedback)
		await page.waitForTimeout(500);
	});
});
