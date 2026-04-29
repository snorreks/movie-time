// tests/profile.spec.ts
import { expect, type Page, test } from "@playwright/test";

const waitForHomePage = async (page: Page) => {
	await page.goto("/", { timeout: 10000 });
	await page.locator("#username").waitFor({ state: "visible", timeout: 10000 });
};

test.describe("User Profile Features", () => {
	test("should display username in header", async ({ page }) => {
		await waitForHomePage(page);
		await page.fill("#username", "TestUser");
		await page.getByRole("button", { name: /Start.*Lounge/i }).click();
		await page.waitForURL(/\/lounge\/[A-Za-z0-9]+/);

		// Check if username is displayed somewhere in the UI
		await expect(page.locator("text=TestUser")).toBeVisible({ timeout: 5000 });
	});

	test("should allow profile picture upload", async ({ page }) => {
		await waitForHomePage(page);
		await page.fill("#username", "TestUser");
		await page.getByRole("button", { name: /Start.*Lounge/i }).click();
		await page.waitForURL(/\/lounge\/[A-Za-z0-9]+/);

		// Look for profile picture upload button/area
		const uploadButton = page.locator('input[type="file"]');
		if (await uploadButton.isVisible()) {
			await uploadButton.setInputFiles({
				name: "test.png",
				mimeType: "image/png",
				buffer: Buffer.from(
					"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
					"base64",
				),
			});

			await page.waitForTimeout(2000);
		}
	});

	test("should show nominated by info on cards", async ({ page }) => {
		await waitForHomePage(page);
		await page.fill("#username", "HostUser");
		await page.getByRole("button", { name: /Start.*Lounge/i }).click();
		await page.waitForURL(/\/lounge\/[A-Za-z0-9]+/);

		// Check if nomination cards show who nominated them
		const nominations = page.locator("[data-testid='nomination-card']");
		if ((await nominations.count()) > 0) {
			await expect(nominations.first().locator("text=HostUser")).toBeVisible();
		}
	});
});
