import { describe, expect, it } from "vitest";
import {
  compareDecisions,
  DECISION_NAME_MAX_LENGTH,
  DECISION_NAME_MIN_LENGTH,
  isValidDecisionName,
  KIND,
  sumFilledWeights,
} from "../js/scoring.js";

describe("sumFilledWeights", () => {
  it("ignores a weight when the text is blank", () => {
    expect(sumFilledWeights([{ text: "", weight: 10 }])).toBe(0);
  });

  it("ignores whitespace-only text", () => {
    expect(sumFilledWeights([{ text: "   ", weight: 10 }])).toBe(0);
  });

  it("counts a filled consideration at its weight", () => {
    expect(sumFilledWeights([{ text: "Higher pay", weight: 8 }])).toBe(8);
  });

  it("counts a filled consideration with weight 0 as 0", () => {
    expect(sumFilledWeights([{ text: "Longer commute", weight: 0 }])).toBe(0);
  });
});

describe("isValidDecisionName", () => {
  it("rejects a blank name", () => {
    expect(isValidDecisionName("")).toBe(false);
  });

  it("rejects whitespace-only names", () => {
    expect(isValidDecisionName("   ")).toBe(false);
  });

  it("accepts names at the minimum length", () => {
    expect(isValidDecisionName("a".repeat(DECISION_NAME_MIN_LENGTH))).toBe(
      true,
    );
  });

  it("accepts names at the maximum length", () => {
    expect(isValidDecisionName("a".repeat(DECISION_NAME_MAX_LENGTH))).toBe(
      true,
    );
  });

  it("rejects names longer than the maximum", () => {
    expect(
      isValidDecisionName("x".repeat(DECISION_NAME_MAX_LENGTH + 1)),
    ).toBe(false);
  });
});

describe("compareDecisions", () => {
  it("does not treat missing names as undefined", () => {
    const result = compareDecisions({
      decisionA: "",
      decisionB: "",
      prosA: [{ text: "Pay", weight: 8 }],
      consA: [],
      prosB: [],
      consB: [],
    });

    expect(result).toEqual({ kind: KIND.missingNames });
  });

  it("reports a tie when the nets are equal", () => {
    expect(
      compareDecisions({
        decisionA: "Stay",
        decisionB: "Leave",
        prosA: [{ text: "Pay", weight: 8 }],
        consA: [],
        prosB: [{ text: "Growth", weight: 8 }],
        consB: [],
      }),
    ).toEqual({ kind: KIND.tie });
  });

  it("reports the lead in points", () => {
    expect(
      compareDecisions({
        decisionA: "Stay",
        decisionB: "Leave",
        prosA: [{ text: "Pay", weight: 9 }],
        consA: [],
        prosB: [{ text: "Growth", weight: 5 }],
        consB: [],
      }),
    ).toEqual({
      kind: KIND.lead,
      winner: "Stay",
      loser: "Leave",
      points: 4,
    });
  });

  it("accepts names at the minimum length", () => {
    const decisionA = "a".repeat(DECISION_NAME_MIN_LENGTH);
    const decisionB = "b".repeat(DECISION_NAME_MIN_LENGTH);

    expect(
      compareDecisions({
        decisionA,
        decisionB,
        prosA: [{ text: "Pay", weight: 8 }],
        consA: [],
        prosB: [],
        consB: [],
      }),
    ).toEqual({
      kind: KIND.lead,
      winner: decisionA,
      loser: decisionB,
      points: 8,
    });
  });

  it("accepts names at the maximum length", () => {
    const decisionA = "a".repeat(DECISION_NAME_MAX_LENGTH);
    const decisionB = "b".repeat(DECISION_NAME_MAX_LENGTH);

    expect(
      compareDecisions({
        decisionA,
        decisionB,
        prosA: [{ text: "Pay", weight: 8 }],
        consA: [],
        prosB: [],
        consB: [],
      }),
    ).toEqual({
      kind: KIND.lead,
      winner: decisionA,
      loser: decisionB,
      points: 8,
    });
  });

  it("does not score when a name is longer than the maximum", () => {
    expect(
      compareDecisions({
        decisionA: "Stay",
        decisionB: "x".repeat(DECISION_NAME_MAX_LENGTH + 1),
        prosA: [{ text: "Pay", weight: 8 }],
        consA: [],
        prosB: [],
        consB: [],
      }),
    ).toEqual({ kind: KIND.nameLength });
  });

  it("treats whitespace-only names as missing", () => {
    expect(
      compareDecisions({
        decisionA: "   ",
        decisionB: "Leave",
        prosA: [{ text: "Pay", weight: 8 }],
        consA: [],
        prosB: [],
        consB: [],
      }),
    ).toEqual({ kind: KIND.missingNames });
  });
});
