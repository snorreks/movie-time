// tests/session.spec.ts
import { expect, type Page, test } from "@playwright/test";

const waitForHomePage = async (page: Page) => {
	await page.goto("/", { timeout: 10000 });
	// Wait for the username input to be visible (ensures Svelte has mounted)
	await page.locator("#username").waitFor({ state: "visible", timeout: 10000 });
};

test.describe("Session Creation", () => {
	test("should create a new session and navigate to lounge", async ({
		page,
	}) => {
		await waitForHomePage(page);

		await page.fill("#username", "TestUser");
		await page.getByRole("button", { name: /Start.*Lounge/i }).click();

		// Wait for navigation to lounge
		await page.waitForURL(/\/lounge\/[A-Za-z0-9]+/, { timeout: 30000 });

		// Verify we're in the lounge
		await expect(page.getByText("The Director's Lounge")).toBeVisible();
	});
});

test.describe("Session Errors", () => {
	test("should show error for invalid session ID", async ({ page }) => {
		await page.goto("/lounge/invalid-session-id", { timeout: 10000 });

		// Should show error message
		await expect(page.getByText("Session not found")).toBeVisible({
			timeout: 10000,
		});
	});
});

test.describe("Session Joining", () => {
	test("should join existing session with valid ID", async ({
		page,
		context,
	}) => {
		// Create a session in first tab
		const page1 = await context.newPage();
		await waitForHomePage(page1);

		await page1.fill("#username", "HostUser");
		await page1.getByRole("button", { name: /Start.*Lounge/i }).click();
		await page1.waitForURL(/\/lounge\/([A-Za-z0-9]+)/, { timeout: 30000 });

		// Extract session ID from URL
		const url = page1.url();
		const sessionId = url.split("/lounge/")[1];

		// Join from second tab
		await waitForHomePage(page);

		await page.fill("#username", "JoinUser");
		await page.fill("#session-id", sessionId);
		await page.getByRole("button", { name: /Join.*Lounge/i }).click();

		// Should navigate to same lounge
		await page.waitForURL(`/lounge/${sessionId}`, { timeout: 30000 });
		await expect(page.getByText("The Director's Lounge")).toBeVisible();
	});
});
