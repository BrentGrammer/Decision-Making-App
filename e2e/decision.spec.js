import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  BLANK_PRO_ERROR,
  CON_PLACEHOLDER,
  DECISION_A_LABEL,
  DECISION_B_LABEL,
  CONTRIBUTORS_CAPTION,
  CONTRIBUTORS_HINT,
  CONTRIBUTORS_HINT_LABEL,
  DECISION_NAME_FIELD_ERROR,
  inFavorOf,
  sharePercent,
  leadResult,
  MODEL_HINTS,
  MODEL_LABELS,
  LOAD_ERROR,
  LOAD_LABEL,
  VALIDATION_ERROR_DISMISS,
  EMPTY_TABLE_VALIDATION_ERROR,
  DECISION_NAME_VALIDATION_ERROR,
  CONSIDERATION_ROW_VALIDATION_ERROR,
  VALIDATION_ERROR_TITLE,
  PRO_PLACEHOLDER,
  REPLACE_CONFIRMATION,
  REMOVE_PRO_LABEL,
  SCORING_MODEL_LABEL,
  SAVE_LABEL,
} from "../js/constants/strings.js";
import { DECISION_NAME_MAX_LENGTH, MODELS } from "../js/scoring.js";

function verdict(page) {
  return page.locator("#finalResult .result-line");
}

function contributorGroups(page) {
  return page.locator("#finalResult .contributor-group");
}

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

  await expect(verdict(page)).toHaveText(
    leadResult("Stay", "Leave", 8, 100),
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

  await expect(page.getByText(DECISION_NAME_VALIDATION_ERROR)).toBeVisible();
  await page.getByRole("button", { name: VALIDATION_ERROR_DISMISS }).click();

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
  await page.getByRole("button", { name: VALIDATION_ERROR_DISMISS }).click();
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
  await expect(verdict(page)).toHaveText(
    leadResult("Stay", "Leave", 8, 100),
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
  await expect(verdict(page)).toHaveText(
    leadResult("Stay", "Leave", 11, 100),
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

  await expect(verdict(page)).toHaveText(
    leadResult("Stay", "Leave", 8, 100),
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
  await expect(page.getByText(VALIDATION_ERROR_TITLE)).toBeVisible();
  await expect(page.locator("#finalResult")).toBeEmpty();
});

test("blocks the calculation until an unnamed rated row is fixed", async ({
  page,
}) => {
  await page.goto("/");
  await useLinearScoring(page);
  await page.getByLabel(DECISION_A_LABEL, { exact: true }).fill("Stay");
  await page.getByLabel(DECISION_B_LABEL, { exact: true }).fill("Leave");
  await page.getByPlaceholder(PRO_PLACEHOLDER).first().fill("Stable team");
  await page.locator(".prosA").first().fill("8");
  await page.locator(".consB").first().fill("5");

  await page.getByRole("button", { name: "Calculate" }).click();
  await expect(page.getByText(CONSIDERATION_ROW_VALIDATION_ERROR)).toBeVisible();

  await page.getByRole("button", { name: VALIDATION_ERROR_DISMISS }).click();
  await expect(page.getByText(CONSIDERATION_ROW_VALIDATION_ERROR)).toBeHidden();

  await page.getByPlaceholder(CON_PLACEHOLDER).last().fill("Long commute");
  await page.getByRole("button", { name: "Calculate" }).click();

  await expect(page.getByText(CONSIDERATION_ROW_VALIDATION_ERROR)).toBeHidden();
  await expect(page.locator("#finalResult")).not.toBeEmpty();
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

test("calculating again scores the same decision table with the newly chosen model", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel(DECISION_A_LABEL, { exact: true }).fill("Stay");
  await page.getByLabel(DECISION_B_LABEL, { exact: true }).fill("Leave");
  await page.getByPlaceholder(PRO_PLACEHOLDER).first().fill("Stable team");
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
  await expect(verdict(page)).toHaveText(leadResult("Stay", "Leave", 52, 35));

  await page.getByLabel(SCORING_MODEL_LABEL).selectOption(MODELS.linear.id);

  // The result stands until the user asks for it again.
  await expect(verdict(page)).toHaveText(leadResult("Stay", "Leave", 52, 35));

  await page.getByRole("button", { name: "Calculate" }).click();

  // Linear counts every point the same, so three 4s (12) now outweigh the 10.
  await expect(verdict(page)).toHaveText(leadResult("Leave", "Stay", 2, 9));
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

test("refuses to calculate an empty decision table", async ({ page }) => {
  await page.goto("/");
  await useLinearScoring(page);
  await page.getByLabel(DECISION_A_LABEL, { exact: true }).fill("Stay");
  await page.getByLabel(DECISION_B_LABEL, { exact: true }).fill("Leave");
  await page.getByRole("button", { name: "Calculate" }).click();

  await expect(page.getByText(EMPTY_TABLE_VALIDATION_ERROR)).toBeVisible();
  await expect(page.locator("#finalResult")).toBeEmpty();

  await page.getByRole("button", { name: VALIDATION_ERROR_DISMISS }).click();
  await page.getByPlaceholder(PRO_PLACEHOLDER).first().fill("Stable team");
  await page.locator(".prosA").first().fill("8");
  await page.getByRole("button", { name: "Calculate" }).click();

  await expect(page.getByText(EMPTY_TABLE_VALIDATION_ERROR)).toBeHidden();
  await expect(page.locator("#finalResult")).not.toBeEmpty();
});

test("tables the rows in favor of each decision", async ({
  page,
}) => {
  await page.goto("/");
  await useLinearScoring(page);
  await page.getByLabel(DECISION_A_LABEL, { exact: true }).fill("Stay");
  await page.getByLabel(DECISION_B_LABEL, { exact: true }).fill("Leave");
  await page.getByPlaceholder(PRO_PLACEHOLDER).first().fill("Stable team");
  await page.locator(".prosA").first().fill("7");
  await page.getByPlaceholder(CON_PLACEHOLDER).nth(1).fill("Long commute");
  await page.locator(".consB").first().fill("5");
  await page.getByPlaceholder(PRO_PLACEHOLDER).nth(1).fill("Higher salary");
  await page.locator(".prosB").first().fill("4");
  await page.getByRole("button", { name: "Calculate" }).click();

  await expect(contributorGroups(page)).toHaveCount(2);
  await expect(page.locator(".contributors-caption")).toContainText(
    CONTRIBUTORS_CAPTION,
  );

  const towardStay = contributorGroups(page).first();
  await expect(towardStay.locator(".contributor-heading")).toHaveText(
    inFavorOf("Stay"),
  );
  await expect(towardStay.locator(".contributor-text")).toHaveText([
    "Stable team",
    "Long commute",
  ]);
  await expect(towardStay.locator(".contributor-rating")).toHaveText(["7", "5"]);
  await expect(towardStay.locator(".contributor-share")).toHaveText([
    sharePercent(44),
    sharePercent(31),
  ]);

  const towardLeave = contributorGroups(page).nth(1);
  await expect(towardLeave.locator(".contributor-heading")).toHaveText(
    inFavorOf("Leave"),
  );
  await expect(towardLeave.locator(".contributor-text")).toHaveText([
    "Higher salary",
  ]);
});

test("explains the contributors table on hover", async ({ page }) => {
  await page.goto("/");
  await useLinearScoring(page);
  await page.getByLabel(DECISION_A_LABEL, { exact: true }).fill("Stay");
  await page.getByLabel(DECISION_B_LABEL, { exact: true }).fill("Leave");
  await page.getByPlaceholder(PRO_PLACEHOLDER).first().fill("Stable team");
  await page.locator(".prosA").first().fill("7");
  await page.getByRole("button", { name: "Calculate" }).click();

  const hint = page.getByRole("button", { name: CONTRIBUTORS_HINT_LABEL });
  const hintText = hint.locator(".hint-text");

  await expect(hintText).toBeHidden();

  await hint.hover();

  await expect(hintText).toBeVisible();
  await expect(hintText).toHaveText(CONTRIBUTORS_HINT);
});

test("saves the decisions to a JSON file", async ({ page }) => {
  await page.goto("/");
  await useLinearScoring(page);
  await page.getByLabel(DECISION_A_LABEL, { exact: true }).fill("Stay");
  await page.getByLabel(DECISION_B_LABEL, { exact: true }).fill("Leave");
  await page.getByPlaceholder(PRO_PLACEHOLDER).first().fill("Stable team");
  await page.locator(".prosA").first().fill("8");
  await page.getByPlaceholder(CON_PLACEHOLDER).last().fill("Long commute");
  await page.locator(".consB").first().fill("5");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: SAVE_LABEL }).click();
  const download = await downloadPromise;
  const json = await readFile(await download.path(), "utf8");

  expect(download.suggestedFilename()).toBe("saved-decisions.json");
  expect(JSON.parse(json)).toEqual({
    format: "decision-making-app-saved-decisions",
    version: 1,
    model: MODELS.linear.id,
    decisions: [
      {
        name: "Stay",
        pros: [{ text: "Stable team", rating: 8 }],
        cons: [{ text: "", rating: 0 }],
      },
      {
        name: "Leave",
        pros: [{ text: "", rating: 0 }],
        cons: [{ text: "Long commute", rating: 5 }],
      },
    ],
  });
});

test("loads saved decisions after replacement is confirmed", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(DECISION_A_LABEL, { exact: true }).fill("Old A");
  await page.getByLabel(DECISION_B_LABEL, { exact: true }).fill("Old B");
  await page.getByPlaceholder(PRO_PLACEHOLDER).first().fill("Old pro");
  await page.locator(".prosA").first().fill("3");
  await page.getByRole("button", { name: "Calculate" }).click();
  await expect(page.locator("#finalResult")).not.toBeEmpty();

  const saved = {
    format: "decision-making-app-saved-decisions",
    version: 1,
    model: MODELS.cubed.id,
    decisions: [
      {
        name: "Stay",
        pros: [
          { text: "Good team", rating: 8 },
          { text: "Short commute", rating: 6 },
        ],
        cons: [{ text: "Lower pay", rating: 4 }],
      },
      {
        name: "Leave",
        pros: [{ text: "New challenge", rating: 7 }],
        cons: [{ text: "Long commute", rating: 5 }],
      },
    ],
  };
  const savedFile = {
    name: "saved-decisions.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(saved)),
  };
  let fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: LOAD_LABEL }).click();
  let fileChooser = await fileChooserPromise;
  let dialogPromise = page.waitForEvent("dialog");
  let setFilesPromise = fileChooser.setFiles(savedFile);
  let dialog = await dialogPromise;
  expect(dialog.message()).toBe(REPLACE_CONFIRMATION);
  await dialog.dismiss();
  await setFilesPromise;

  await expect(page.getByLabel(DECISION_A_LABEL, { exact: true })).toHaveValue("Old A");
  await expect(page.getByLabel(DECISION_B_LABEL, { exact: true })).toHaveValue("Old B");
  await expect(page.locator("#finalResult")).not.toBeEmpty();

  fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: LOAD_LABEL }).click();
  fileChooser = await fileChooserPromise;
  dialogPromise = page.waitForEvent("dialog");
  setFilesPromise = fileChooser.setFiles(savedFile);
  dialog = await dialogPromise;
  expect(dialog.message()).toBe(REPLACE_CONFIRMATION);
  await dialog.accept();
  await setFilesPromise;

  await expect(page.getByLabel(DECISION_A_LABEL, { exact: true })).toHaveValue("Stay");
  await expect(page.getByLabel(DECISION_B_LABEL, { exact: true })).toHaveValue("Leave");
  await expect(page.getByLabel(SCORING_MODEL_LABEL)).toHaveValue(MODELS.cubed.id);
  await expect(page.locator(".prosA")).toHaveCount(2);
  await expect(page.locator(".prosA").first()).toHaveValue("8");
  await expect(page.locator(".prosA").nth(1)).toHaveValue("6");
  const savedPros = page.locator("[data-group='prosA'] input[type='text']");
  await expect(savedPros.first()).toHaveValue("Good team");
  await expect(savedPros.nth(1)).toHaveValue("Short commute");
  await expect(page.locator("[data-group='prosA'] .sliderStatus").nth(1)).toHaveValue("6");
  await expect(page.locator(".consA")).toHaveValue("4");
  await expect(page.locator("[data-group='consA'] input[type='text']")).toHaveValue("Lower pay");
  await expect(page.locator(".prosB")).toHaveValue("7");
  await expect(page.locator("[data-group='prosB'] input[type='text']")).toHaveValue("New challenge");
  await expect(page.locator(".consB")).toHaveValue("5");
  await expect(page.locator("[data-group='consB'] input[type='text']")).toHaveValue("Long commute");
  await expect(page.locator("#model-hint")).toHaveText(MODEL_HINTS[MODELS.cubed.id]);
  await expect(page.locator("#finalResult")).toBeEmpty();
});

test("rejects an invalid saved decisions file without changing the table", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel(DECISION_A_LABEL, { exact: true }).fill("Stay");
  await page.getByLabel(DECISION_B_LABEL, { exact: true }).fill("Leave");
  await page.getByPlaceholder(PRO_PLACEHOLDER).first().fill("Good team");
  await page.locator(".prosA").first().fill("8");

  let fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: LOAD_LABEL }).click();
  let fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{"),
  });

  await expect(page.getByText(LOAD_ERROR)).toBeVisible();
  await expect(page.getByLabel(DECISION_A_LABEL, { exact: true })).toHaveValue("Stay");
  await expect(page.getByLabel(DECISION_B_LABEL, { exact: true })).toHaveValue("Leave");
  await expect(page.getByPlaceholder(PRO_PLACEHOLDER).first()).toHaveValue("Good team");
  await expect(page.locator(".prosA").first()).toHaveValue("8");

  fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: LOAD_LABEL }).click();
  fileChooser = await fileChooserPromise;
  const dialogPromise = page.waitForEvent("dialog");
  const setFilesPromise = fileChooser.setFiles({
    name: "saved-decisions.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        format: "decision-making-app-saved-decisions",
        version: 1,
        model: MODELS.squared.id,
        decisions: [
          {
            name: "Keep",
            pros: [{ text: "", rating: 0 }],
            cons: [{ text: "", rating: 0 }],
          },
          {
            name: "Change",
            pros: [{ text: "", rating: 0 }],
            cons: [{ text: "", rating: 0 }],
          },
        ],
      }),
    ),
  });
  const dialog = await dialogPromise;
  expect(dialog.message()).toBe(REPLACE_CONFIRMATION);
  await dialog.accept();
  await setFilesPromise;

  await expect(page.getByText(LOAD_ERROR)).toHaveCount(0);
  await expect(page.getByLabel(DECISION_A_LABEL, { exact: true })).toHaveValue("Keep");
  await expect(page.getByLabel(DECISION_B_LABEL, { exact: true })).toHaveValue("Change");
});
