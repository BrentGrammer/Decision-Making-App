import { expect, test } from "@playwright/test";
import {
  BLANK_PRO_ERROR,
  DECISION_A_LABEL,
  DECISION_B_LABEL,
  DECISION_NAME_FIELD_ERROR,
  leadResult,
  PRO_PLACEHOLDER,
  REMOVE_PRO_LABEL,
  TIE_RESULT,
} from "../js/constants/strings.js";
import { DECISION_NAME_MAX_LENGTH } from "../js/scoring.js";

test("calculates a lead from named options", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(DECISION_A_LABEL, { exact: true }).fill("Stay");
  await page.getByLabel(DECISION_B_LABEL, { exact: true }).fill("Leave");
  await page.getByPlaceholder(PRO_PLACEHOLDER).first().fill("Pay");
  await page.locator(".prosA").first().fill("8");
  await page.getByRole("button", { name: "Calculate" }).click();

  await expect(page.locator("#finalResult")).toHaveText(
    leadResult("Stay", "Leave", 8),
  );
});

test("scrolls the result into view after calculate", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 360 });
  await page.goto("/");
  await page.getByLabel(DECISION_A_LABEL, { exact: true }).fill("Stay");
  await page.getByLabel(DECISION_B_LABEL, { exact: true }).fill("Leave");
  await page.getByPlaceholder(PRO_PLACEHOLDER).first().fill("Pay");
  await page.locator(".prosA").first().fill("8");
  await page.getByRole("button", { name: "Calculate" }).click();

  await expect(page.locator("#finalResult")).toBeInViewport({ ratio: 1 });
});

test("shows field errors when names are missing", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Calculate" }).click();

  await expect(page.getByLabel(DECISION_A_LABEL, { exact: true })).toHaveAttribute(
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
  await page.getByLabel(DECISION_A_LABEL, { exact: true }).fill("Stay");

  await expect(page.getByLabel(DECISION_A_LABEL, { exact: true })).not.toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#A-error")).toBeHidden();
});

test("reset clears names, result, and name errors", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(DECISION_A_LABEL, { exact: true }).fill("Stay");
  await page.getByLabel(DECISION_B_LABEL, { exact: true }).fill("Leave");
  await page.getByPlaceholder(PRO_PLACEHOLDER).first().fill("Pay");
  await page.locator(".prosA").first().fill("8");
  await page.getByRole("button", { name: "Calculate" }).click();
  await expect(page.locator("#finalResult")).toHaveText(
    leadResult("Stay", "Leave", 8),
  );

  await page.getByRole("button", { name: "Reset" }).click();

  await expect(page.getByLabel(DECISION_A_LABEL, { exact: true })).toHaveValue("");
  await expect(page.getByLabel(DECISION_B_LABEL, { exact: true })).toHaveValue("");
  await expect(page.locator("#finalResult")).toHaveText("");
  await expect(page.locator("#A-error")).toBeHidden();
});

test("does not let a decision name exceed the maximum length", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel(DECISION_A_LABEL, { exact: true })
    .pressSequentially("a".repeat(DECISION_NAME_MAX_LENGTH + 1));

  await expect(page.getByLabel(DECISION_A_LABEL, { exact: true })).toHaveValue(
    "a".repeat(DECISION_NAME_MAX_LENGTH),
  );
});

test("adds a pro without adding a con and counts the extra row", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel(DECISION_A_LABEL, { exact: true }).fill("Stay");
  await page.getByLabel(DECISION_B_LABEL, { exact: true }).fill("Leave");
  await page.getByPlaceholder(PRO_PLACEHOLDER).first().fill("Pay");
  await page.locator(".prosA").first().fill("8");
  await page.getByRole("button", { name: "Add a pro for decision A" }).click();
  await page.getByPlaceholder(PRO_PLACEHOLDER).nth(1).fill("Team");
  await page.locator(".prosA").nth(1).fill("3");
  await page.getByRole("button", { name: "Calculate" }).click();

  await expect(page.locator(".consA")).toHaveCount(1);
  await expect(page.locator("#finalResult")).toHaveText(
    leadResult("Stay", "Leave", 11),
  );
});

test("stops counting a pro after it is removed", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(DECISION_A_LABEL, { exact: true }).fill("Stay");
  await page.getByLabel(DECISION_B_LABEL, { exact: true }).fill("Leave");
  await page.getByPlaceholder(PRO_PLACEHOLDER).first().fill("Pay");
  await page.locator(".prosA").first().fill("8");
  await page.getByRole("button", { name: "Add a pro for decision A" }).click();
  await page.getByPlaceholder(PRO_PLACEHOLDER).nth(1).fill("Team");
  await page.locator(".prosA").nth(1).fill("3");
  await page.getByRole("button", { name: REMOVE_PRO_LABEL }).nth(1).click();
  await page.getByRole("button", { name: "Calculate" }).click();

  await expect(page.locator("#finalResult")).toHaveText(
    leadResult("Stay", "Leave", 8),
  );
});

test("warns when a slider is moved with no text", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(DECISION_A_LABEL, { exact: true }).fill("Stay");
  await page.getByLabel(DECISION_B_LABEL, { exact: true }).fill("Leave");
  await page.locator(".prosA").first().fill("8");

  await expect(page.getByPlaceholder(PRO_PLACEHOLDER).first()).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByText(BLANK_PRO_ERROR)).toBeVisible();

  await page.getByRole("button", { name: "Calculate" }).click();
  await expect(page.locator("#finalResult")).toHaveText(TIE_RESULT);
});

test("does not show remove when a list has one pro", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("button", { name: REMOVE_PRO_LABEL }),
  ).toHaveCount(0);
});

test("shows a Remove tooltip when hovering over the remove button", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add a pro for decision A" }).click();
  const removeButton = page
    .getByRole("button", { name: REMOVE_PRO_LABEL })
    .first();
  await removeButton.hover();

  const tooltip = removeButton.locator(".remove-tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveText("Remove");
});

