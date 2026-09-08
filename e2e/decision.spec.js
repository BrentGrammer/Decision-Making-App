import { expect, test } from "@playwright/test";

test("calculates a lead from named options", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Decision A").fill("Stay");
  await page.getByLabel("Decision B").fill("Leave");
  await page.getByPlaceholder("Enter a pro").first().fill("Pay");
  await page.locator(".prosA").first().fill("8");
  await page.getByRole("button", { name: "Calculate" }).click();

  await expect(page.locator("#finalResult")).toHaveText(
    "RESULT: Stay is better than Leave by 8 points.",
  );
});

test("shows field errors when names are missing", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Calculate" }).click();

  await expect(page.getByLabel("Decision A")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#A-error")).toBeVisible();
  await expect(page.locator("#A-error")).toHaveText(
    "Enter a name (1–50 characters).",
  );
  await expect(page.locator("#B-error")).toBeVisible();
});

test("clears a name field error when the name becomes valid", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Calculate" }).click();
  await page.getByLabel("Decision A").fill("Stay");

  await expect(page.getByLabel("Decision A")).not.toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#A-error")).toBeHidden();
});

test("reset clears names, result, and name errors", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Decision A").fill("Stay");
  await page.getByLabel("Decision B").fill("Leave");
  await page.getByPlaceholder("Enter a pro").first().fill("Pay");
  await page.locator(".prosA").first().fill("8");
  await page.getByRole("button", { name: "Calculate" }).click();
  await expect(page.locator("#finalResult")).toContainText("Stay is better");

  await page.getByRole("button", { name: "Reset" }).click();

  await expect(page.getByLabel("Decision A")).toHaveValue("");
  await expect(page.getByLabel("Decision B")).toHaveValue("");
  await expect(page.locator("#finalResult")).toHaveText("");
  await expect(page.locator("#A-error")).toBeHidden();
});

test("does not let a decision name exceed 50 characters", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Decision A").pressSequentially("a".repeat(51));

  await expect(page.getByLabel("Decision A")).toHaveValue("a".repeat(50));
});
