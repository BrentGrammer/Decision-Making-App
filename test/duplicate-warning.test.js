import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSIDERATION_GROUPS,
  DUPLICATE_WARNING_CLASS,
} from "../js/constants/decision-table.js";
import { leadResult } from "../js/constants/strings.js";
import { MODELS } from "../js/scoring.js";
import {
  addConsideration,
  enterConsideration,
  loadApp,
  removeConsideration,
  selectScoringModel,
  setDecisionNames,
  verdictLine,
} from "./loadApp.js";

const DECISION_A_PROS = CONSIDERATION_GROUPS.prosA.id;
const DECISION_B_PROS = CONSIDERATION_GROUPS.prosB.id;
const DECISION_B_CONS = CONSIDERATION_GROUPS.consB.id;

const HIGHER_SALARY = "Higher salary";
const MORE_DISPOSABLE_INCOME = "More disposable income";
const BETTER_FINANCES = "Better finances";
const HIGHER_PAY_DUPLICATES = [
  HIGHER_SALARY,
  MORE_DISPOSABLE_INCOME,
  BETTER_FINANCES,
];

function mockDuplicateConsiderationDetector(...duplicateConsiderationFixtures) {
  return vi.fn(async (considerations) =>
    duplicateConsiderationFixtures
      .map((duplicateConsiderations) =>
        considerations.flatMap((consideration, index) =>
          duplicateConsiderations.includes(consideration) ? [index] : [],
        ),
      )
      .filter((duplicateIndexes) => duplicateIndexes.length > 1),
  );
}

function failingDuplicateConsiderationDetector() {
  return vi.fn(async () => {
    throw new Error("network down");
  });
}

function findDuplicateConsiderationsButton() {
  return [...document.querySelectorAll("button")].find(
    (button) => button.textContent.trim() === "Find duplicate considerations",
  );
}

function openDialog() {
  return document.querySelector("dialog[open]");
}

function dialogButton(dialog, label) {
  return [...dialog.querySelectorAll("button")].find(
    (button) => button.textContent.trim() === label,
  );
}

function scanForDuplicates() {
  findDuplicateConsiderationsButton().click();
  const dialog = openDialog();
  if (dialog) {
    dialogButton(dialog, "Continue").click();
  }
}

function duplicateWarnings(group) {
  return [
    ...document.querySelectorAll(
      `[data-group="${group}"] .${DUPLICATE_WARNING_CLASS}`,
    ),
  ];
}

function allDuplicateWarnings() {
  return [...document.querySelectorAll(`.${DUPLICATE_WARNING_CLASS}`)];
}

function dismissDuplicateWarning(group) {
  duplicateWarnings(group)[0].querySelector("button").click();
}

async function waitForPendingDetections() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function enterRows(group, considerations) {
  considerations.forEach((consideration, index) => {
    if (index > 0) {
      addConsideration(group);
    }
    enterConsideration(group, index, consideration);
  });
}

describe("duplicate consideration warning", () => {
  let duplicateConsiderationDetector;

  function startAppWith(detector) {
    duplicateConsiderationDetector = detector;
    loadApp({ duplicateConsiderationDetector });
    selectScoringModel(MODELS.linear.id);
  }

  beforeEach(() => {
    startAppWith(mockDuplicateConsiderationDetector(HIGHER_PAY_DUPLICATES));
  });

  it("does not detect automatically before the user clicks Find duplicate considerations", async () => {
    enterRows(DECISION_A_PROS, [HIGHER_SALARY, MORE_DISPOSABLE_INCOME]);

    await waitForPendingDetections();
    expect(duplicateConsiderationDetector).not.toHaveBeenCalled();
    expect(allDuplicateWarnings()).toHaveLength(0);
  });

  it("asks for privacy confirmation before sending considerations, and does nothing if cancelled", async () => {
    enterRows(DECISION_A_PROS, [HIGHER_SALARY, MORE_DISPOSABLE_INCOME]);

    findDuplicateConsiderationsButton().click();

    const dialog = openDialog();
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toMatch(/API|external|third[- ]party/i);

    dialogButton(dialog, "Cancel").click();
    await waitForPendingDetections();

    expect(dialog.open).toBe(false);
    expect(duplicateConsiderationDetector).not.toHaveBeenCalled();
    expect(allDuplicateWarnings()).toHaveLength(0);
  });

  it("remembers confirmation for the current session on subsequent scans", async () => {
    enterRows(DECISION_A_PROS, [HIGHER_SALARY, MORE_DISPOSABLE_INCOME]);
    findDuplicateConsiderationsButton().click();
    const dialog = openDialog();
    dialogButton(dialog, "Continue").click();
    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(1),
    );

    const detectionsBefore =
      duplicateConsiderationDetector.mock.calls.length;
    findDuplicateConsiderationsButton().click();

    expect(openDialog()).toBeNull();
    await vi.waitFor(() =>
      expect(duplicateConsiderationDetector.mock.calls.length).toBeGreaterThan(
        detectionsBefore,
      ),
    );
  });

  it("warns when two pros of the same decision say the same thing", async () => {
    enterRows(DECISION_A_PROS, [HIGHER_SALARY, MORE_DISPOSABLE_INCOME]);
    scanForDuplicates();

    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(1),
    );
    const warning = duplicateWarnings(DECISION_A_PROS)[0].textContent;
    expect(warning).toContain(HIGHER_SALARY);
    expect(warning).toContain(MORE_DISPOSABLE_INCOME);
  });

  it("names all rows of a larger duplicate group in one warning", async () => {
    enterRows(DECISION_A_PROS, HIGHER_PAY_DUPLICATES);
    scanForDuplicates();

    await vi.waitFor(() => {
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(1);
      const warning = duplicateWarnings(DECISION_A_PROS)[0].textContent;
      for (const consideration of HIGHER_PAY_DUPLICATES) {
        expect(warning).toContain(consideration);
      }
    });
  });

  it("warns on cons as well as pros", async () => {
    const longCommute = "Long commute";
    const timeInTheCar = "Time in the car";
    startAppWith(
      mockDuplicateConsiderationDetector([longCommute, timeInTheCar]),
    );

    enterRows(DECISION_B_CONS, [longCommute, timeInTheCar]);
    scanForDuplicates();

    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_B_CONS)).toHaveLength(1),
    );
  });

  it("does not warn when the rows are genuinely different", async () => {
    enterRows(DECISION_A_PROS, [HIGHER_SALARY, "Shorter commute"]);
    scanForDuplicates();

    await vi.waitFor(() =>
      expect(duplicateConsiderationDetector).toHaveBeenCalled(),
    );
    await waitForPendingDetections();
    expect(allDuplicateWarnings()).toHaveLength(0);
  });

  it("does not compare rows across decisions", async () => {
    const higherPay = "Higher pay";
    startAppWith(mockDuplicateConsiderationDetector([higherPay]));

    enterRows(DECISION_A_PROS, [higherPay, "Stable team"]);
    enterRows(DECISION_B_PROS, [higherPay, "Shorter commute"]);
    scanForDuplicates();

    await vi.waitFor(() =>
      expect(duplicateConsiderationDetector).toHaveBeenCalled(),
    );
    await waitForPendingDetections();
    expect(allDuplicateWarnings()).toHaveLength(0);
  });

  it("does not detect until two pros or cons of the same decision have text", async () => {
    enterConsideration(DECISION_A_PROS, 0, HIGHER_SALARY);
    addConsideration(DECISION_A_PROS);
    addConsideration(DECISION_A_PROS);
    scanForDuplicates();

    await waitForPendingDetections();
    expect(duplicateConsiderationDetector).not.toHaveBeenCalled();
    expect(allDuplicateWarnings()).toHaveLength(0);
  });

  it("does not ask about blank rows", async () => {
    const blank = "";
    enterRows(DECISION_A_PROS, [HIGHER_SALARY, blank, BETTER_FINANCES]);
    scanForDuplicates();

    await vi.waitFor(() =>
      expect(duplicateConsiderationDetector).toHaveBeenCalled(),
    );
    for (const [considerations] of duplicateConsiderationDetector.mock.calls) {
      expect(considerations).not.toContain(blank);
    }
  });

  it("does not block Calculate or change the score", async () => {
    const stay = "Stay";
    const leave = "Leave";
    const salaryRating = 8;
    const incomeRating = 7;
    setDecisionNames(stay, leave);
    enterConsideration(DECISION_A_PROS, 0, HIGHER_SALARY, salaryRating);
    addConsideration(DECISION_A_PROS);
    enterConsideration(DECISION_A_PROS, 1, MORE_DISPOSABLE_INCOME, incomeRating);
    scanForDuplicates();
    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(1),
    );

    globalThis.calculate();

    expect(verdictLine()).toBe(
      leadResult(stay, leave, salaryRating + incomeRating, 100),
    );
  });

  it("clears the warning when a row is edited to something different", async () => {
    enterRows(DECISION_A_PROS, [HIGHER_SALARY, MORE_DISPOSABLE_INCOME]);
    scanForDuplicates();
    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(1),
    );

    enterConsideration(DECISION_A_PROS, 1, "Stable team");

    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(0),
    );
  });

  it("clears the warning when one of the duplicate rows is removed", async () => {
    enterRows(DECISION_A_PROS, [HIGHER_SALARY, MORE_DISPOSABLE_INCOME]);
    scanForDuplicates();
    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(1),
    );

    removeConsideration(DECISION_A_PROS, 1);

    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(0),
    );
  });

  it("lets the user dismiss a warning and keep both rows", async () => {
    enterRows(DECISION_A_PROS, [HIGHER_SALARY, MORE_DISPOSABLE_INCOME]);
    scanForDuplicates();
    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(1),
    );

    dismissDuplicateWarning(DECISION_A_PROS);

    expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(0);
    expect(document.getElementsByClassName(DECISION_A_PROS)).toHaveLength(2);
  });

  it("keeps a dismissed warning hidden when other rows change and scanned again", async () => {
    enterRows(DECISION_A_PROS, [HIGHER_SALARY, MORE_DISPOSABLE_INCOME]);
    scanForDuplicates();
    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(1),
    );
    dismissDuplicateWarning(DECISION_A_PROS);
    const detectionsBefore =
      duplicateConsiderationDetector.mock.calls.length;

    addConsideration(DECISION_A_PROS);
    enterConsideration(DECISION_A_PROS, 2, "Stable team");
    scanForDuplicates();

    await vi.waitFor(() =>
      expect(duplicateConsiderationDetector.mock.calls.length).toBeGreaterThan(
        detectionsBefore,
      ),
    );
    await waitForPendingDetections();
    expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(0);
  });

  it("shows no warning and no error when detection fails", async () => {
    const stay = "Stay";
    const leave = "Leave";
    const salaryRating = 8;
    const incomeRating = 7;
    startAppWith(failingDuplicateConsiderationDetector());
    setDecisionNames(stay, leave);
    enterConsideration(DECISION_A_PROS, 0, HIGHER_SALARY, salaryRating);
    addConsideration(DECISION_A_PROS);
    enterConsideration(DECISION_A_PROS, 1, MORE_DISPOSABLE_INCOME, incomeRating);
    scanForDuplicates();

    await vi.waitFor(() =>
      expect(duplicateConsiderationDetector).toHaveBeenCalled(),
    );
    await waitForPendingDetections();
    expect(allDuplicateWarnings()).toHaveLength(0);

    globalThis.calculate();
    expect(verdictLine()).toBe(
      leadResult(stay, leave, salaryRating + incomeRating, 100),
    );
  });

  it("clears warnings on Reset", async () => {
    enterRows(DECISION_A_PROS, [HIGHER_SALARY, MORE_DISPOSABLE_INCOME]);
    scanForDuplicates();
    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(1),
    );

    document.querySelector("form").reset();
    globalThis.resetSliders();

    expect(allDuplicateWarnings()).toHaveLength(0);
  });
});
