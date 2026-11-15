import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSIDERATION_GROUPS,
  DUPLICATE_WARNING_CLASS,
} from "../js/constants/decision-table.js";
import {
  DETECT_DUPLICATES_LABEL,
  DUPLICATE_NEEDS_PAIR_VALIDATION_ERROR,
  DUPLICATE_PRIVACY_CANCEL,
  DUPLICATE_PRIVACY_CONTINUE,
  DUPLICATE_WARNING_DISMISS,
  DUPLICATE_WARNING_REMOVE,
  leadResult,
} from "../js/constants/strings.js";
import { MODELS } from "../js/scoring.js";
import {
  addConsideration,
  considerationTextInput,
  enterConsideration,
  loadApp,
  removeConsideration,
  selectScoringModel,
  setDecisionNames,
  validationDialog,
  validationErrorMessages,
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

function mockDuplicateConsiderationsDetector(...duplicateConsiderationsFixtures) {
  return vi.fn(async (considerations) =>
    duplicateConsiderationsFixtures
      .map((duplicateConsiderations) =>
        considerations.flatMap((consideration, index) =>
          duplicateConsiderations.includes(consideration) ? [index] : [],
        ),
      )
      .filter((duplicateIndexes) => duplicateIndexes.length > 1),
  );
}

function failingDuplicateConsiderationsDetector() {
  return vi.fn(async () => {
    throw new Error("network down");
  });
}

function detectDuplicateConsiderationsButton() {
  return [...document.querySelectorAll("button")].find(
    (button) => button.textContent.trim() === DETECT_DUPLICATES_LABEL,
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
  detectDuplicateConsiderationsButton().click();
  const dialog = openDialog();
  if (dialog) {
    dialogButton(dialog, DUPLICATE_PRIVACY_CONTINUE).click();
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

function warningButton(group, label) {
  return [...duplicateWarnings(group)[0].querySelectorAll("button")].find(
    (button) => button.textContent.trim() === label,
  );
}

function dismissDuplicateWarning(group) {
  warningButton(group, DUPLICATE_WARNING_DISMISS).click();
}

function removeDuplicatesFromWarning(group) {
  warningButton(group, DUPLICATE_WARNING_REMOVE).click();
}

async function waitForPendingDetections() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function enterConsiderations(group, considerations) {
  considerations.forEach((consideration, index) => {
    if (index > 0) {
      addConsideration(group);
    }
    enterConsideration(group, index, consideration);
  });
}

describe("duplicate consideration warning", () => {
  let duplicateConsiderationsDetector;

  function startAppWith(detector) {
    duplicateConsiderationsDetector = detector;
    loadApp({ duplicateConsiderationsDetector });
    selectScoringModel(MODELS.linear.id);
  }

  beforeEach(() => {
    startAppWith(mockDuplicateConsiderationsDetector(HIGHER_PAY_DUPLICATES));
  });

  it("does not detect automatically before the user clicks Detect duplicate considerations", async () => {
    enterConsiderations(DECISION_A_PROS, [HIGHER_SALARY, MORE_DISPOSABLE_INCOME]);

    await waitForPendingDetections();
    expect(duplicateConsiderationsDetector).not.toHaveBeenCalled();
    expect(allDuplicateWarnings()).toHaveLength(0);
  });

  it("asks for privacy confirmation before sending considerations, and does nothing if cancelled", async () => {
    enterConsiderations(DECISION_A_PROS, [HIGHER_SALARY, MORE_DISPOSABLE_INCOME]);

    detectDuplicateConsiderationsButton().click();

    const dialog = openDialog();
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toMatch(/API|external|third[- ]party/i);

    dialogButton(dialog, DUPLICATE_PRIVACY_CANCEL).click();
    await waitForPendingDetections();

    expect(dialog.open).toBe(false);
    expect(duplicateConsiderationsDetector).not.toHaveBeenCalled();
    expect(allDuplicateWarnings()).toHaveLength(0);
  });

  it("remembers confirmation for the current session on subsequent scans", async () => {
    enterConsiderations(DECISION_A_PROS, [HIGHER_SALARY, MORE_DISPOSABLE_INCOME]);
    detectDuplicateConsiderationsButton().click();
    const dialog = openDialog();
    dialogButton(dialog, DUPLICATE_PRIVACY_CONTINUE).click();
    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(1),
    );

    const detectionsBefore =
      duplicateConsiderationsDetector.mock.calls.length;
    detectDuplicateConsiderationsButton().click();

    expect(openDialog()).toBeNull();
    await vi.waitFor(() =>
      expect(duplicateConsiderationsDetector.mock.calls.length).toBeGreaterThan(
        detectionsBefore,
      ),
    );
  });

  it("warns when two pros of the same decision say the same thing", async () => {
    enterConsiderations(DECISION_A_PROS, [HIGHER_SALARY, MORE_DISPOSABLE_INCOME]);
    scanForDuplicates();

    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(1),
    );
    const warning = duplicateWarnings(DECISION_A_PROS)[0].textContent;
    expect(warning).toContain(HIGHER_SALARY);
    expect(warning).toContain(MORE_DISPOSABLE_INCOME);
  });

  it("names all considerations of a larger duplicate group in one warning", async () => {
    enterConsiderations(DECISION_A_PROS, HIGHER_PAY_DUPLICATES);
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
      mockDuplicateConsiderationsDetector([longCommute, timeInTheCar]),
    );

    enterConsiderations(DECISION_B_CONS, [longCommute, timeInTheCar]);
    scanForDuplicates();

    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_B_CONS)).toHaveLength(1),
    );
  });

  it("does not warn when the considerations are genuinely different", async () => {
    enterConsiderations(DECISION_A_PROS, [HIGHER_SALARY, "Shorter commute"]);
    scanForDuplicates();

    await vi.waitFor(() =>
      expect(duplicateConsiderationsDetector).toHaveBeenCalled(),
    );
    await waitForPendingDetections();
    expect(allDuplicateWarnings()).toHaveLength(0);
  });

  it("does not compare considerations across decisions", async () => {
    const higherPay = "Higher pay";
    startAppWith(mockDuplicateConsiderationsDetector([higherPay]));

    enterConsiderations(DECISION_A_PROS, [higherPay, "Stable team"]);
    enterConsiderations(DECISION_B_PROS, [higherPay, "Shorter commute"]);
    scanForDuplicates();

    await vi.waitFor(() =>
      expect(duplicateConsiderationsDetector).toHaveBeenCalled(),
    );
    await waitForPendingDetections();
    expect(allDuplicateWarnings()).toHaveLength(0);
  });

  it("shows a validation message and does not detect when no considerations are entered", async () => {
    detectDuplicateConsiderationsButton().click();

    await waitForPendingDetections();
    expect(validationDialog().open).toBe(true);
    expect(validationErrorMessages()).toContain(
      DUPLICATE_NEEDS_PAIR_VALIDATION_ERROR,
    );
    expect(duplicateConsiderationsDetector).not.toHaveBeenCalled();
    expect(allDuplicateWarnings()).toHaveLength(0);
  });

  it("does not detect until two pros or cons of the same decision have text", async () => {
    enterConsideration(DECISION_A_PROS, 0, HIGHER_SALARY);
    addConsideration(DECISION_A_PROS);
    addConsideration(DECISION_A_PROS);
    detectDuplicateConsiderationsButton().click();

    await waitForPendingDetections();
    expect(validationDialog().open).toBe(true);
    expect(validationErrorMessages()).toContain(
      DUPLICATE_NEEDS_PAIR_VALIDATION_ERROR,
    );
    expect(duplicateConsiderationsDetector).not.toHaveBeenCalled();
    expect(allDuplicateWarnings()).toHaveLength(0);
  });

  it("does not ask about blank considerations", async () => {
    const blank = "";
    enterConsiderations(DECISION_A_PROS, [HIGHER_SALARY, blank, BETTER_FINANCES]);
    scanForDuplicates();

    await vi.waitFor(() =>
      expect(duplicateConsiderationsDetector).toHaveBeenCalled(),
    );
    for (const [considerations] of duplicateConsiderationsDetector.mock.calls) {
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

  it("clears the warning when a consideration is edited to something different", async () => {
    enterConsiderations(DECISION_A_PROS, [HIGHER_SALARY, MORE_DISPOSABLE_INCOME]);
    scanForDuplicates();
    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(1),
    );

    enterConsideration(DECISION_A_PROS, 1, "Stable team");

    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(0),
    );
  });

  it("clears the warning when one of the duplicate considerations is removed", async () => {
    enterConsiderations(DECISION_A_PROS, [HIGHER_SALARY, MORE_DISPOSABLE_INCOME]);
    scanForDuplicates();
    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(1),
    );

    removeConsideration(DECISION_A_PROS, 1);

    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(0),
    );
  });

  it("lets the user dismiss a warning and keep both considerations", async () => {
    enterConsiderations(DECISION_A_PROS, [HIGHER_SALARY, MORE_DISPOSABLE_INCOME]);
    scanForDuplicates();
    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(1),
    );

    dismissDuplicateWarning(DECISION_A_PROS);

    expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(0);
    expect(document.getElementsByClassName(DECISION_A_PROS)).toHaveLength(2);
  });

  it("removes duplicate considerations by keeping the highest-rated consideration and removing the others", async () => {
    enterConsideration(DECISION_A_PROS, 0, HIGHER_SALARY, 6);
    addConsideration(DECISION_A_PROS);
    enterConsideration(DECISION_A_PROS, 1, MORE_DISPOSABLE_INCOME, 9);
    addConsideration(DECISION_A_PROS);
    enterConsideration(DECISION_A_PROS, 2, BETTER_FINANCES, 7);
    addConsideration(DECISION_A_PROS);
    enterConsideration(DECISION_A_PROS, 3, "Shorter commute", 5);
    scanForDuplicates();
    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(1),
    );

    removeDuplicatesFromWarning(DECISION_A_PROS);

    expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(0);
    const sliders = [...document.getElementsByClassName(DECISION_A_PROS)];
    expect(sliders).toHaveLength(2);
    expect(considerationTextInput(DECISION_A_PROS, 0).value).toBe(
      MORE_DISPOSABLE_INCOME,
    );
    expect(sliders[0].value).toBe("9");
    expect(considerationTextInput(DECISION_A_PROS, 1).value).toBe(
      "Shorter commute",
    );
    expect(sliders[1].value).toBe("5");
  });

  it("keeps the first duplicate consideration when removing duplicates with tied ratings", async () => {
    enterConsideration(DECISION_A_PROS, 0, HIGHER_SALARY, 7);
    addConsideration(DECISION_A_PROS);
    enterConsideration(DECISION_A_PROS, 1, MORE_DISPOSABLE_INCOME, 7);
    scanForDuplicates();
    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(1),
    );

    removeDuplicatesFromWarning(DECISION_A_PROS);

    expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(0);
    const sliders = [...document.getElementsByClassName(DECISION_A_PROS)];
    expect(sliders).toHaveLength(1);
    expect(considerationTextInput(DECISION_A_PROS, 0).value).toBe(
      HIGHER_SALARY,
    );
    expect(sliders[0].value).toBe("7");
  });

  it("shows a dismissed warning again when scanned again", async () => {
    enterConsiderations(DECISION_A_PROS, [HIGHER_SALARY, MORE_DISPOSABLE_INCOME]);
    scanForDuplicates();
    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(1),
    );
    dismissDuplicateWarning(DECISION_A_PROS);
    expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(0);
    const detectionsBefore =
      duplicateConsiderationsDetector.mock.calls.length;

    scanForDuplicates();

    await vi.waitFor(() =>
      expect(duplicateConsiderationsDetector.mock.calls.length).toBeGreaterThan(
        detectionsBefore,
      ),
    );
    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(1),
    );
  });

  it("shows no warning and no error when detection fails", async () => {
    const stay = "Stay";
    const leave = "Leave";
    const salaryRating = 8;
    const incomeRating = 7;
    startAppWith(failingDuplicateConsiderationsDetector());
    setDecisionNames(stay, leave);
    enterConsideration(DECISION_A_PROS, 0, HIGHER_SALARY, salaryRating);
    addConsideration(DECISION_A_PROS);
    enterConsideration(DECISION_A_PROS, 1, MORE_DISPOSABLE_INCOME, incomeRating);
    scanForDuplicates();

    await vi.waitFor(() =>
      expect(duplicateConsiderationsDetector).toHaveBeenCalled(),
    );
    await waitForPendingDetections();
    expect(allDuplicateWarnings()).toHaveLength(0);

    globalThis.calculate();
    expect(verdictLine()).toBe(
      leadResult(stay, leave, salaryRating + incomeRating, 100),
    );
  });

  it("clears warnings on Reset", async () => {
    enterConsiderations(DECISION_A_PROS, [HIGHER_SALARY, MORE_DISPOSABLE_INCOME]);
    scanForDuplicates();
    await vi.waitFor(() =>
      expect(duplicateWarnings(DECISION_A_PROS)).toHaveLength(1),
    );

    document.querySelector("form").reset();
    globalThis.resetSliders();

    expect(allDuplicateWarnings()).toHaveLength(0);
  });

  it("disables the detect button and shows a spinner while detection is running", async () => {
    let resolveDetect;
    const pendingDetector = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveDetect = resolve;
        }),
    );
    startAppWith(pendingDetector);
    enterConsiderations(DECISION_A_PROS, [HIGHER_SALARY, MORE_DISPOSABLE_INCOME]);

    const detectButton = document.getElementById("detect-duplicates");
    scanForDuplicates();

    expect(pendingDetector).toHaveBeenCalledTimes(1);
    expect(detectButton.disabled).toBe(true);
    expect(detectButton.getAttribute("aria-busy")).toBe("true");
    expect(detectButton.querySelector(".loading-spinner")).not.toBeNull();

    resolveDetect([]);

    await vi.waitFor(() => {
      expect(detectButton.disabled).toBe(false);
    });
    expect(detectButton.getAttribute("aria-busy")).toBeNull();
    expect(detectButton.querySelector(".loading-spinner")).toBeNull();
  });
});
