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
});
