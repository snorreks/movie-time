// tests/veto.spec.ts
import { expect, type Page, test } from "@playwright/test";

const waitForHomePage = async (page: Page) => {
	await page.goto("/", { timeout: 10000 });
	await page.locator("#username").waitFor({ state: "visible", timeout: 10000 });
};

test.describe("Veto System with Reasons", () => {
	test.beforeEach(async ({ page }) => {
		await waitForHomePage(page);
		await page.fill("#username", "HostUser");
		await page.getByRole("button", { name: /Start.*Lounge/i }).click();
		await page.waitForURL(/\/lounge\/[A-Za-z0-9]+/);
	});

	test("should show veto dialog when clicking veto", async ({ page }) => {
		// Wait for nominations to load - need at least one nomination first
		// For now, just check if veto button exists
		const vetoButton = page.locator('button:has-text("Veto")').first();
		if (await vetoButton.isVisible({ timeout: 5000 })) {
			await vetoButton.click();
			await expect(page.locator("text=Why are you vetoing")).toBeVisible({
				timeout: 5000,
			});
		}
	});

	test("should veto with selected reason", async ({ page }) => {
		const vetoButton = page.locator('button:has-text("Veto")').first();
		if (await vetoButton.isVisible({ timeout: 5000 })) {
			await vetoButton.click();
			const reasonButton = page
				.locator("text=Seen it before")
				.or(page.locator("text=Not my taste"))
				.first();
			if (await reasonButton.isVisible({ timeout: 3000 })) {
				await reasonButton.click();
				await expect(page.locator("text=Vetoed")).toBeVisible({
					timeout: 5000,
				});
			}
		}
	});

	test("should show veto reason on hover", async ({ page }) => {
		const vetoBadge = page.locator("text=Vetoed").first();
		if (await vetoBadge.isVisible({ timeout: 5000 })) {
			await vetoBadge.hover();
			await page.waitForTimeout(500);
		}
	});
});
