// e2e/auth-and-session.spec.ts
import { expect, test } from "@playwright/test";

test.describe("Admin Auth and Session Creation", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to the app
		await page.goto("http://localhost:5173");
	});

	test("should show admin login when toggle is clicked", async ({ page }) => {
		// Click admin mode toggle
		await page.click('button:has-text("Admin Login")');

		// Should show admin email and password fields
		await expect(page.locator("#admin-email")).toBeVisible();
		await expect(page.locator("#admin-password")).toBeVisible();
	});

	test("should create session with name", async ({ page }) => {
		// Enable admin mode
		await page.click('button:has-text("Admin Login")');

		// Fill in admin credentials (adjust for your emulator setup)
		await page.fill("#admin-email", "admin@directors-lounge.dev");
		await page.fill("#admin-password", "admin123!");
		await page.fill("#username", "Test Admin");
		await page.fill("#session-name", "Friday Night Movies");

		// Click create session
		await page.click('button:has-text("Login & Start Lounge")');

		// Should navigate to lounge page
		await expect(page).toHaveURL(/\/lounge\/.*/);

		// Should show session name
		await expect(page.locator("text=Friday Night Movies")).toBeVisible();
	});

	test("should show pizza users", async ({ page }) => {
		// This test assumes you have a session with users who want pizza
		// You'll need to set up test data in the emulator
	});
});

test.describe("Veto Flow", () => {
	test("should move vetoed movies to end", async ({ page }) => {
		// Navigate to a session with nominations
		// Veto a movie
		// Check that it appears at the end of the grid
	});
});

test.describe("Snackbar Notifications", () => {
	test("should show loading snackbar when suggesting movie", async ({
		page,
	}) => {
		// Type in concierge prompt
		// Click suggest
		// Should see loading snackbar
		await page.fill('input[placeholder*="sci-fi"]', "action movie");
		await page.click('button:has-text("Suggest")');

		// Snackbar should appear
		await expect(page.locator("text=Asking the AI Concierge")).toBeVisible();
	});
});
