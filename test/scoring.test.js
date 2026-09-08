import { describe, expect, it } from "vitest";
import { compareDecisions, sumFilledWeights } from "../scoring.js";

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

    expect(result).not.toMatch(/undefined/i);
    expect(result).toBe("RESULT: Enter both decision names first.");
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
    ).toMatch(/equally/i);
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
    ).toBe("RESULT: Stay is better than Leave by 4 points.");
  });

  it("accepts names of one character", () => {
    expect(
      compareDecisions({
        decisionA: "A",
        decisionB: "B",
        prosA: [{ text: "Pay", weight: 8 }],
        consA: [],
        prosB: [],
        consB: [],
      }),
    ).toBe("RESULT: A is better than B by 8 points.");
  });

  it("accepts names of 50 characters", () => {
    const decisionA = "a".repeat(50);
    const decisionB = "b".repeat(50);

    expect(
      compareDecisions({
        decisionA,
        decisionB,
        prosA: [{ text: "Pay", weight: 8 }],
        consA: [],
        prosB: [],
        consB: [],
      }),
    ).toBe(`RESULT: ${decisionA} is better than ${decisionB} by 8 points.`);
  });

  it("does not score when a name is longer than 50 characters", () => {
    expect(
      compareDecisions({
        decisionA: "Stay",
        decisionB: "x".repeat(51),
        prosA: [{ text: "Pay", weight: 8 }],
        consA: [],
        prosB: [],
        consB: [],
      }),
    ).toBe("RESULT: Each decision name must be 1–50 characters.");
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
    ).toBe("RESULT: Enter both decision names first.");
  });
});
