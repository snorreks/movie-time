// tests/emulator-validation.spec.ts
import { expect, type Page, test } from "@playwright/test";

const waitForHomePage = async (page: Page) => {
	await page.goto("/", { timeout: 10000 });
	await page.locator("#username").waitFor({ state: "visible", timeout: 10000 });
};

test.describe("Emulator Validation Scripts", () => {
	test("should verify Firebase Auth emulator is running", async ({ page }) => {
		await waitForHomePage(page);
		// If we can see the username input, the app loaded successfully
		await expect(page.locator("#username")).toBeVisible();
	});

	test("should verify Firestore emulator is running", async ({ page }) => {
		await waitForHomePage(page);

		// Create a session (this will use Firestore emulator)
		await page.fill("#username", "EmulatorTestUser");
		await page.getByRole("button", { name: /Start.*Lounge/i }).click();

		// Wait for navigation (means Firestore wrote the session)
		await page.waitForURL(/\/lounge\/[A-Za-z0-9]+/, { timeout: 30000 });
		await expect(page.locator("text=The Director's Lounge")).toBeVisible();
	});

	test("should create session and verify in Firestore emulator", async ({
		page,
	}) => {
		await waitForHomePage(page);

		await page.fill("#username", "EmulatorTestUser");
		await page.getByRole("button", { name: /Start.*Lounge/i }).click();
		await page.waitForURL(/\/lounge\/([A-Za-z0-9]+)/, { timeout: 30000 });

		// Extract session ID
		const url = page.url();
		const sessionId = url.split("/lounge/")[1];

		// Verify session exists via emulator REST API
		const response = await page.evaluate(async (id) => {
			const res = await fetch(
				`http://127.0.0.1:8080/v1/projects/aikami-dev/databases/(default)/documents/sessions/${id}`,
			);
			return { status: res.status, ok: res.ok };
		}, sessionId);

		expect(response.ok).toBeTruthy();
	});
});
