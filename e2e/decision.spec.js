import { expect, test } from "@playwright/test";
import {
  BLANK_PRO_ERROR,
  DECISION_A_LABEL,
  DECISION_B_LABEL,
  DECISION_NAME_FIELD_ERROR,
  leadResult,
  MODEL_HINTS,
  MODEL_LABELS,
  PRO_PLACEHOLDER,
  REMOVE_PRO_LABEL,
  SCORING_MODEL_LABEL,
  TIE_RESULT,
} from "../js/constants/strings.js";
import { DECISION_NAME_MAX_LENGTH, MODELS } from "../js/scoring.js";

// Point totals below are linear sums, so these tests choose Linear and stay
// about rows and names rather than about the scoring curve.
async function useLinearScoring(page) {
  await page
    .getByLabel(SCORING_MODEL_LABEL)
    .selectOption(MODELS.linear.id);
}

test("calculates a lead from named options", async ({ page }) => {
  await page.goto("/");
  await useLinearScoring(page);
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
  await useLinearScoring(page);
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
  await useLinearScoring(page);
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
  await useLinearScoring(page);
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
  await useLinearScoring(page);
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
  await useLinearScoring(page);
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

test("calculating again scores the same sheet with the newly chosen model", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel(DECISION_A_LABEL, { exact: true }).fill("Stay");
  await page.getByLabel(DECISION_B_LABEL, { exact: true }).fill("Leave");
  await page.getByPlaceholder(PRO_PLACEHOLDER).first().fill("Near family");
  await page.locator(".prosA").first().fill("10");
  await page.getByPlaceholder(PRO_PLACEHOLDER).nth(1).fill("Higher salary");
  await page.locator(".prosB").first().fill("4");
  for (const [index, text] of ["New city", "Shorter commute"].entries()) {
    await page.getByRole("button", { name: "Add a pro for decision B" }).click();
    await page.getByPlaceholder(PRO_PLACEHOLDER).nth(index + 2).fill(text);
    await page.locator(".prosB").nth(index + 1).fill("4");
  }
  await page.getByRole("button", { name: "Calculate" }).click();

  // Squared is the default, and weighs the one 10 (100) above three 4s (48).
  await expect(page.locator("#finalResult")).toContainText("Stay is better");

  await page.getByLabel(SCORING_MODEL_LABEL).selectOption(MODELS.linear.id);

  // The result stands until the user asks for it again.
  await expect(page.locator("#finalResult")).toContainText("Stay is better");

  await page.getByRole("button", { name: "Calculate" }).click();

  // Linear counts every point the same, so three 4s (12) now outweigh the 10.
  await expect(page.locator("#finalResult")).toContainText("Leave is better");
});

test("explains the selected scoring model", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel(SCORING_MODEL_LABEL)).toHaveValue(
    MODELS.squared.id,
  );
  await expect(page.locator("#model-hint")).toHaveText(
    MODEL_HINTS[MODELS.squared.id],
  );

  await page
    .getByLabel(SCORING_MODEL_LABEL)
    .selectOption({ label: MODEL_LABELS[MODELS.dealbreaker.id] });

  await expect(page.locator("#model-hint")).toHaveText(
    MODEL_HINTS[MODELS.dealbreaker.id],
  );
});
