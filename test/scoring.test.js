import { describe, expect, it } from "vitest";
import {
  compareDecisions,
  DECISION_NAME_MAX_LENGTH,
  DECISION_NAME_MIN_LENGTH,
  isValidDecisionName,
  KIND,
  MODELS,
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

  describe("scoring models", () => {
    const oneTenAgainstThreeFours = {
      decisionA: "Stay",
      decisionB: "Leave",
      prosA: [{ text: "Near family", weight: 10 }],
      consA: [],
      prosB: [
        { text: "Higher salary", weight: 4 },
        { text: "New city", weight: 4 },
        { text: "Shorter commute", weight: 4 },
      ],
      consB: [],
    };

    const oneSevenAgainstTwoFives = {
      decisionA: "Stay",
      decisionB: "Leave",
      prosA: [{ text: "Near family", weight: 7 }],
      consA: [],
      prosB: [
        { text: "Higher salary", weight: 5 },
        { text: "New city", weight: 5 },
      ],
      consB: [],
    };

    const oneTenAgainstTwoNines = {
      decisionA: "Stay",
      decisionB: "Leave",
      prosA: [{ text: "Near family", weight: 10 }],
      consA: [],
      prosB: [
        { text: "Higher salary", weight: 9 },
        { text: "New city", weight: 9 },
      ],
      consB: [],
    };

    it("lets three 4s beat one 10 under linear", () => {
      expect(
        compareDecisions({
          ...oneTenAgainstThreeFours,
          model: MODELS.linear.id,
        }),
      ).toEqual({
        kind: KIND.lead,
        winner: "Leave",
        loser: "Stay",
        points: 2,
      });
    });

    it("lets one 10 beat three 4s under squared", () => {
      expect(
        compareDecisions({
          ...oneTenAgainstThreeFours,
          model: MODELS.squared.id,
        }),
      ).toEqual({
        kind: KIND.lead,
        winner: "Stay",
        loser: "Leave",
        points: 52,
      });
    });

    it("lets two 5s edge out one 7 under squared", () => {
      expect(
        compareDecisions({
          ...oneSevenAgainstTwoFives,
          model: MODELS.squared.id,
        }).winner,
      ).toBe("Leave");
    });

    it("lets one 7 beat two 5s under cubed", () => {
      expect(
        compareDecisions({
          ...oneSevenAgainstTwoFives,
          model: MODELS.cubed.id,
        }).winner,
      ).toBe("Stay");
    });

    it("lets two 9s beat one 10 under cubed", () => {
      expect(
        compareDecisions({
          ...oneTenAgainstTwoNines,
          model: MODELS.cubed.id,
        }).winner,
      ).toBe("Leave");
    });

    it("makes one 10 exactly match two 9s under doubling", () => {
      expect(
        compareDecisions({
          ...oneTenAgainstTwoNines,
          model: MODELS.doubling.id,
        }),
      ).toEqual({ kind: KIND.tie });
    });

    it("gives a 0 rating no weight under doubling", () => {
      expect(
        compareDecisions({
          decisionA: "Stay",
          decisionB: "Leave",
          prosA: [
            { text: "Near family", weight: 5 },
            { text: "Same weather", weight: 0 },
          ],
          consA: [],
          prosB: [{ text: "Higher salary", weight: 5 }],
          consB: [],
          model: MODELS.doubling.id,
        }),
      ).toEqual({ kind: KIND.tie });
    });

    it("subtracts weighted cons, not raw ones", () => {
      expect(
        compareDecisions({
          decisionA: "Stay",
          decisionB: "Leave",
          prosA: [{ text: "Near family", weight: 6 }],
          consA: [{ text: "Small flat", weight: 4 }],
          prosB: [{ text: "Higher salary", weight: 5 }],
          consB: [],
          model: MODELS.squared.id,
        }),
      ).toEqual({
        kind: KIND.lead,
        winner: "Leave",
        loser: "Stay",
        points: 5,
      });
    });

    it("can turn a lead into a tie under a different model", () => {
      expect(
        compareDecisions({
          decisionA: "Stay",
          decisionB: "Leave",
          prosA: [{ text: "Near family", weight: 5 }],
          consA: [],
          prosB: [
            { text: "Higher salary", weight: 4 },
            { text: "New city", weight: 3 },
          ],
          consB: [],
          model: MODELS.squared.id,
        }),
      ).toEqual({ kind: KIND.tie });
    });

    it("scores dealbreaker like linear for now", () => {
      const args = {
        decisionA: "Stay",
        decisionB: "Leave",
        prosA: [{ text: "Near family", weight: 7 }],
        consA: [{ text: "Small flat", weight: 10 }],
        prosB: [{ text: "Higher salary", weight: 5 }],
        consB: [],
      };

      expect(
        compareDecisions({ ...args, model: MODELS.dealbreaker.id }),
      ).toEqual(compareDecisions({ ...args, model: MODELS.linear.id }));
    });

    it("scores an unknown model id the same as none at all", () => {
      const args = {
        decisionA: "Stay",
        decisionB: "Leave",
        prosA: [{ text: "Near family", weight: 9 }],
        consA: [],
        prosB: [{ text: "Higher salary", weight: 5 }],
        consB: [],
      };

      expect(compareDecisions({ ...args, model: "nonsense" })).toEqual(
        compareDecisions(args),
      );
    });

    it("still names a winner when no model is given", () => {
      expect(
        compareDecisions({
          decisionA: "Stay",
          decisionB: "Leave",
          prosA: [{ text: "Near family", weight: 9 }],
          consA: [],
          prosB: [{ text: "Higher salary", weight: 5 }],
          consB: [],
        }),
      ).toMatchObject({ kind: KIND.lead, winner: "Stay", loser: "Leave" });
    });
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
