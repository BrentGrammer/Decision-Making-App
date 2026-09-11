import { beforeEach, describe, expect, test } from "vitest";
import {
    addConsideration,
    fillConsideration,
    validationDialog,
    validationErrorMessages,
    loadApp,
    resultLines,
    selectScoringModel,
    setDecisionNames,
} from "./loadApp.js";
import {
    EMPTY_TABLE_VALIDATION_ERROR,
    DECISION_NAME_LENGTH_VALIDATION_ERROR,
    DECISION_NAME_VALIDATION_ERROR,
    CONSIDERATION_ROW_VALIDATION_ERROR,
} from "../js/constants/strings.js";
import { DECISION_NAME_MAX_LENGTH } from "../js/scoring.js";

function calculateApp() {
    globalThis.calculate();
}

describe("calculating a decision table with rated but unnamed rows", () => {
    beforeEach(() => {
        loadApp();
        selectScoringModel("linear");
        setDecisionNames("Stay", "Leave");
    });

    test("tells the user the decision table could not be calculated", () => {
        fillConsideration("prosA", 0, "near family", 8);
        fillConsideration("consB", 0, "", 5);

        calculateApp();

        expect(validationDialog().open).toBe(true);
        expect(validationDialog().textContent).toContain(
            CONSIDERATION_ROW_VALIDATION_ERROR,
        );
    });

    test("does not show a result", () => {
        fillConsideration("prosA", 0, "near family", 8);
        fillConsideration("consB", 0, "", 5);

        calculateApp();

        expect(resultLines()).toEqual([]);
    });

    test("clears a result left over from an earlier calculation", () => {
        fillConsideration("prosA", 0, "near family", 8);
        calculateApp();
        expect(resultLines().length).toBeGreaterThan(0);

        fillConsideration("consB", 0, "", 5);
        calculateApp();

        expect(resultLines()).toEqual([]);
    });

    test("calculates once the row is named", () => {
        fillConsideration("prosA", 0, "near family", 8);
        fillConsideration("consB", 0, "", 5);
        calculateApp();

        fillConsideration("consB", 0, "long commute", 5);
        calculateApp();

        expect(validationDialog().open).toBe(false);
        expect(resultLines().length).toBeGreaterThan(0);
    });

    test("counts every unnamed row, not just the first", () => {
        addConsideration("prosA");
        fillConsideration("prosA", 0, "", 4);
        fillConsideration("prosA", 1, "", 6);

        calculateApp();

        expect(validationDialog().open).toBe(true);
    });

    test("dismissing the dialog closes it", () => {
        fillConsideration("consB", 0, "", 5);
        calculateApp();

        validationDialog().querySelector(".dialog-dismiss").click();

        expect(validationDialog().open).toBe(false);
    });
});

describe("calculating a decision table whose rated rows are all named", () => {
    beforeEach(() => {
        loadApp();
        selectScoringModel("linear");
        setDecisionNames("Stay", "Leave");
    });

    test("does not open the dialog", () => {
        fillConsideration("prosA", 0, "near family", 8);
        fillConsideration("prosB", 0, "higher salary", 5);

        calculateApp();

        expect(validationDialog().open).toBe(false);
        expect(resultLines().length).toBeGreaterThan(0);
    });

    test("ignores a named row left at zero and a blank row left at zero", () => {
        fillConsideration("prosA", 0, "near family", 8);
        fillConsideration("consA", 0, "noisy street", 0);
        fillConsideration("consB", 0, "", 0);

        calculateApp();

        expect(validationDialog().open).toBe(false);
        expect(resultLines().length).toBeGreaterThan(0);
    });
});

describe("calculating a decision table with missing decision names", () => {
    beforeEach(() => {
        loadApp();
        selectScoringModel("linear");
    });

    test("says both names are needed when neither is filled in", () => {
        fillConsideration("prosA", 0, "near family", 8);

        calculateApp();

        expect(validationDialog().open).toBe(true);
        expect(validationErrorMessages()).toContain(DECISION_NAME_VALIDATION_ERROR);
        expect(resultLines()).toEqual([]);
    });

    test("says so when only one name is filled in", () => {
        setDecisionNames("Stay", "");
        fillConsideration("prosA", 0, "near family", 8);

        calculateApp();

        expect(validationDialog().open).toBe(true);
        expect(validationErrorMessages()).toContain(DECISION_NAME_VALIDATION_ERROR);
    });

    test("treats a whitespace-only name as missing", () => {
        setDecisionNames("   ", "Leave");
        fillConsideration("prosA", 0, "near family", 8);

        calculateApp();

        expect(validationErrorMessages()).toContain(DECISION_NAME_VALIDATION_ERROR);
    });

    test("says so when a name is longer than the maximum", () => {
        setDecisionNames("Stay", "x".repeat(DECISION_NAME_MAX_LENGTH + 1));
        fillConsideration("prosA", 0, "near family", 8);

        calculateApp();

        expect(validationErrorMessages()).toContain(
            DECISION_NAME_LENGTH_VALIDATION_ERROR,
        );
    });

    test("calculates once both names are filled in", () => {
        fillConsideration("prosA", 0, "near family", 8);
        calculateApp();

        setDecisionNames("Stay", "Leave");
        calculateApp();

        expect(validationDialog().open).toBe(false);
        expect(resultLines().length).toBeGreaterThan(0);
    });
});

describe("calculating an empty decision table", () => {
    beforeEach(() => {
        loadApp();
        selectScoringModel("linear");
        setDecisionNames("Stay", "Leave");
    });

    test("says there is nothing to compare when no row is filled in", () => {
        calculateApp();

        expect(validationDialog().open).toBe(true);
        expect(validationErrorMessages()).toContain(EMPTY_TABLE_VALIDATION_ERROR);
        expect(resultLines()).toEqual([]);
    });

    test("says so when every row is named but left at zero", () => {
        fillConsideration("prosA", 0, "near family", 0);
        fillConsideration("consB", 0, "long commute", 0);

        calculateApp();

        expect(validationErrorMessages()).toContain(EMPTY_TABLE_VALIDATION_ERROR);
    });

    test("reports the unnamed row rather than emptiness when a row is rated", () => {
        fillConsideration("prosA", 0, "", 8);

        calculateApp();

        expect(validationErrorMessages()).toContain(
            CONSIDERATION_ROW_VALIDATION_ERROR,
        );
        expect(validationErrorMessages()).not.toContain(EMPTY_TABLE_VALIDATION_ERROR);
    });

    test("calculates once a row is rated", () => {
        calculateApp();

        fillConsideration("prosA", 0, "near family", 8);
        calculateApp();

        expect(validationDialog().open).toBe(false);
        expect(resultLines().length).toBeGreaterThan(0);
    });
});

describe("a decision table with more than one validation error", () => {
    beforeEach(() => {
        loadApp();
        selectScoringModel("linear");
    });

    test("reports every validation error at once", () => {
        fillConsideration("prosA", 0, "", 8);

        calculateApp();

        expect(validationErrorMessages()).toEqual([
            DECISION_NAME_VALIDATION_ERROR,
            CONSIDERATION_ROW_VALIDATION_ERROR,
        ]);
    });
});
