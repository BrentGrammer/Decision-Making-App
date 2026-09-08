import { expect, test } from "@playwright/test";
import {
  DECISION_NAME_FIELD_ERROR,
  leadResult,
} from "../js/constants/strings.js";
import { DECISION_NAME_MAX_LENGTH } from "../js/scoring.js";

test("calculates a lead from named options", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Decision A").fill("Stay");
  await page.getByLabel("Decision B").fill("Leave");
  await page.getByPlaceholder("Enter a pro").first().fill("Pay");
  await page.locator(".prosA").first().fill("8");
  await page.getByRole("button", { name: "Calculate" }).click();

  await expect(page.locator("#finalResult")).toHaveText(
    leadResult("Stay", "Leave", 8),
  );
});

test("scrolls the result into view after calculate", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 360 });
  await page.goto("/");
  await page.getByLabel("Decision A").fill("Stay");
  await page.getByLabel("Decision B").fill("Leave");
  await page.getByPlaceholder("Enter a pro").first().fill("Pay");
  await page.locator(".prosA").first().fill("8");
  await page.getByRole("button", { name: "Calculate" }).click();

  await expect(page.locator("#finalResult")).toBeInViewport({ ratio: 1 });
});

test("shows field errors when names are missing", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Calculate" }).click();

  await expect(page.getByLabel("Decision A")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#A-error")).toBeVisible();
  await expect(page.locator("#A-error")).toHaveText(DECISION_NAME_FIELD_ERROR);
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
  await expect(page.locator("#finalResult")).toHaveText(
    leadResult("Stay", "Leave", 8),
  );

  await page.getByRole("button", { name: "Reset" }).click();

  await expect(page.getByLabel("Decision A")).toHaveValue("");
  await expect(page.getByLabel("Decision B")).toHaveValue("");
  await expect(page.locator("#finalResult")).toHaveText("");
  await expect(page.locator("#A-error")).toBeHidden();
});

test("does not let a decision name exceed the maximum length", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Decision A")
    .pressSequentially("a".repeat(DECISION_NAME_MAX_LENGTH + 1));

  await expect(page.getByLabel("Decision A")).toHaveValue(
    "a".repeat(DECISION_NAME_MAX_LENGTH),
  );
});
