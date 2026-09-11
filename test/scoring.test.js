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
        model: MODELS.linear.id,
      }),
    ).toMatchObject({
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
        model: MODELS.linear.id,
      }),
    ).toMatchObject({
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
        model: MODELS.linear.id,
      }),
    ).toMatchObject({
      kind: KIND.lead,
      winner: decisionA,
      loser: decisionB,
      points: 8,
    });
  });

  describe("scoring models", () => {
    const oneTenAgainstThreeFours = {
      decisionA: "Stay",
      decisionB: "Leave",
      prosA: [{ text: "Stable team", weight: 10 }],
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
      prosA: [{ text: "Stable team", weight: 7 }],
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
      prosA: [{ text: "Stable team", weight: 10 }],
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
      ).toMatchObject({
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
      ).toMatchObject({
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
            { text: "Stable team", weight: 5 },
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
          prosA: [{ text: "Stable team", weight: 6 }],
          consA: [{ text: "Small flat", weight: 4 }],
          prosB: [{ text: "Higher salary", weight: 5 }],
          consB: [],
          model: MODELS.squared.id,
        }),
      ).toMatchObject({
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
          prosA: [{ text: "Stable team", weight: 5 }],
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

    it("scores an unknown model id the same as none at all", () => {
      const args = {
        decisionA: "Stay",
        decisionB: "Leave",
        prosA: [{ text: "Stable team", weight: 9 }],
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
          prosA: [{ text: "Stable team", weight: 9 }],
          consA: [],
          prosB: [{ text: "Higher salary", weight: 5 }],
          consB: [],
        }),
      ).toMatchObject({ kind: KIND.lead, winner: "Stay", loser: "Leave" });
    });
  });

  describe("margin", () => {
    const linear = MODELS.linear.id;

    it("reads a three point lead as large on a small decision table", () => {
      expect(
        compareDecisions({
          decisionA: "Stay",
          decisionB: "Leave",
          prosA: [{ text: "Stable team", weight: 5 }],
          consA: [],
          prosB: [{ text: "Higher salary", weight: 2 }],
          consB: [],
          model: linear,
        }).marginPercent,
      ).toBe(43);
    });

    it("reads the same three point lead as small on a crowded decision table", () => {
      expect(
        compareDecisions({
          decisionA: "Stay",
          decisionB: "Leave",
          prosA: [{ text: "Stable team", weight: 10 }],
          consA: [{ text: "Small flat", weight: 7 }],
          prosB: [{ text: "Higher salary", weight: 10 }],
          consB: [{ text: "Long commute", weight: 10 }],
          model: linear,
        }).marginPercent,
      ).toBe(8);
    });

    it("reports a full margin when the winner is all pros and the loser all cons", () => {
      expect(
        compareDecisions({
          decisionA: "Stay",
          decisionB: "Leave",
          prosA: [{ text: "Stable team", weight: 8 }],
          consA: [],
          prosB: [],
          consB: [{ text: "Long commute", weight: 6 }],
          model: linear,
        }).marginPercent,
      ).toBe(100);
    });

    it("shrinks the margin when equal weight is added to both options", () => {
      const before = compareDecisions({
        decisionA: "Stay",
        decisionB: "Leave",
        prosA: [{ text: "Stable team", weight: 5 }],
        consA: [],
        prosB: [{ text: "Higher salary", weight: 2 }],
        consB: [],
        model: linear,
      });
      const after = compareDecisions({
        decisionA: "Stay",
        decisionB: "Leave",
        prosA: [
          { text: "Stable team", weight: 5 },
          { text: "Known neighbours", weight: 6 },
        ],
        consA: [],
        prosB: [
          { text: "Higher salary", weight: 2 },
          { text: "New scenery", weight: 6 },
        ],
        consB: [],
        model: linear,
      });

      expect(after.winner).toBe(before.winner);
      expect(after.points).toBe(before.points);
      expect(after.marginPercent).toBeLessThan(before.marginPercent);
    });

    it("reports the margin as a whole percent", () => {
      const { marginPercent } = compareDecisions({
        decisionA: "Stay",
        decisionB: "Leave",
        prosA: [{ text: "Stable team", weight: 7 }],
        consA: [],
        prosB: [{ text: "Higher salary", weight: 4 }],
        consB: [],
        model: linear,
      });

      expect(Number.isInteger(marginPercent)).toBe(true);
    });

    it("measures the margin in the chosen model's units", () => {
      const table = {
        decisionA: "Stay",
        decisionB: "Leave",
        prosA: [{ text: "Stable team", weight: 10 }],
        consA: [],
        prosB: [
          { text: "Higher salary", weight: 6 },
          { text: "New city", weight: 6 },
        ],
        consB: [],
      };

      expect(
        compareDecisions({ ...table, model: MODELS.squared.id }).marginPercent,
      ).not.toBe(
        compareDecisions({ ...table, model: linear }).marginPercent,
      );
    });

    it("reports no margin for a tie", () => {
      expect(
        compareDecisions({
          decisionA: "Stay",
          decisionB: "Leave",
          prosA: [{ text: "Stable team", weight: 5 }],
          consA: [],
          prosB: [{ text: "Higher salary", weight: 5 }],
          consB: [],
          model: linear,
        }),
      ).toEqual({ kind: KIND.tie });
    });

    it("calls an empty decision table a tie rather than dividing by nothing", () => {
      expect(
        compareDecisions({
          decisionA: "Stay",
          decisionB: "Leave",
          prosA: [],
          consA: [],
          prosB: [],
          consB: [],
          model: linear,
        }),
      ).toEqual({ kind: KIND.tie });
    });
  });

});

describe("contributors", () => {
  const linear = MODELS.linear.id;

  it("names the winner's own pros as driving its lead", () => {
    const { contributors } = compareDecisions({
      decisionA: "Stay",
      decisionB: "Leave",
      prosA: [{ text: "Stable team", weight: 10 }],
      consA: [],
      prosB: [{ text: "Higher salary", weight: 3 }],
      consB: [],
      model: linear,
    });

    expect(contributors.toward).toEqual([
      { text: "Stable team", rating: 10, option: "Stay" },
    ]);
  });

  it("counts the loser's cons as pushing toward the winner", () => {
    const { contributors } = compareDecisions({
      decisionA: "Stay",
      decisionB: "Leave",
      prosA: [{ text: "Stable team", weight: 4 }],
      consA: [],
      prosB: [],
      consB: [{ text: "Long commute", weight: 8 }],
      model: linear,
    });

    expect(contributors.toward).toEqual([
      { text: "Long commute", rating: 8, option: "Leave" },
      { text: "Stable team", rating: 4, option: "Stay" },
    ]);
  });

  it("names the rows pulling the other way, whichever option they belong to", () => {
    const { contributors } = compareDecisions({
      decisionA: "Stay",
      decisionB: "Leave",
      prosA: [{ text: "Stable team", weight: 10 }],
      consA: [{ text: "Small flat", weight: 2 }],
      prosB: [{ text: "Higher salary", weight: 5 }],
      consB: [],
      model: linear,
    });

    expect(contributors.against).toEqual([
      { text: "Higher salary", rating: 5, option: "Leave" },
      { text: "Small flat", rating: 2, option: "Stay" },
    ]);
  });

  it("has nothing pulling the other way when every row favours the winner", () => {
    const { contributors } = compareDecisions({
      decisionA: "Stay",
      decisionB: "Leave",
      prosA: [{ text: "Stable team", weight: 7 }],
      consA: [],
      prosB: [],
      consB: [{ text: "Long commute", weight: 5 }],
      model: linear,
    });

    expect(contributors.against).toEqual([]);
  });

  it("lists no more than the three strongest rows behind the winner", () => {
    const { contributors } = compareDecisions({
      decisionA: "Stay",
      decisionB: "Leave",
      prosA: [
        { text: "Stable team", weight: 10 },
        { text: "Known neighbours", weight: 9 },
        { text: "Cheap rent", weight: 8 },
        { text: "Good school", weight: 7 },
      ],
      consA: [],
      prosB: [{ text: "Higher salary", weight: 3 }],
      consB: [],
      model: linear,
    });

    expect(contributors.toward.map((row) => row.text)).toEqual([
      "Stable team",
      "Known neighbours",
      "Cheap rent",
    ]);
  });

  it("lists no more than the three strongest rows pulling the other way", () => {
    const { contributors } = compareDecisions({
      decisionA: "Stay",
      decisionB: "Leave",
      prosA: [
        { text: "Stable team", weight: 10 },
        { text: "Cheap rent", weight: 10 },
        { text: "Good schools", weight: 10 },
      ],
      consA: [],
      prosB: [
        { text: "Higher salary", weight: 9 },
        { text: "New city", weight: 8 },
        { text: "Shorter commute", weight: 7 },
        { text: "Better weather", weight: 6 },
      ],
      consB: [{ text: "Long commute", weight: 10 }],
      model: linear,
    });

    expect(contributors.against.map((row) => row.text)).toEqual([
      "Higher salary",
      "New city",
      "Shorter commute",
    ]);
  });

  it("leaves out a row the user rated 0", () => {
    const { contributors } = compareDecisions({
      decisionA: "Stay",
      decisionB: "Leave",
      prosA: [
        { text: "Stable team", weight: 6 },
        { text: "Same weather", weight: 0 },
      ],
      consA: [],
      prosB: [{ text: "Higher salary", weight: 2 }],
      consB: [],
      model: linear,
    });

    expect(contributors.toward).toEqual([
      { text: "Stable team", rating: 6, option: "Stay" },
    ]);
  });

  it("leaves out a row with no text", () => {
    const { contributors } = compareDecisions({
      decisionA: "Stay",
      decisionB: "Leave",
      prosA: [
        { text: "Stable team", weight: 6 },
        { text: "   ", weight: 9 },
      ],
      consA: [],
      prosB: [{ text: "Higher salary", weight: 2 }],
      consB: [],
      model: linear,
    });

    expect(contributors.toward).toEqual([
      { text: "Stable team", rating: 6, option: "Stay" },
    ]);
  });

  it("swaps which rows drive the result when the model changes the winner", () => {
    const table = {
      decisionA: "Stay",
      decisionB: "Leave",
      prosA: [{ text: "Stable team", weight: 10 }],
      consA: [],
      prosB: [
        { text: "Higher salary", weight: 4 },
        { text: "New city", weight: 4 },
        { text: "Shorter commute", weight: 4 },
      ],
      consB: [],
    };

    expect(
      compareDecisions({ ...table, model: linear }).contributors.against,
    ).toEqual([{ text: "Stable team", rating: 10, option: "Stay" }]);
    expect(
      compareDecisions({ ...table, model: MODELS.squared.id }).contributors
        .toward,
    ).toEqual([{ text: "Stable team", rating: 10, option: "Stay" }]);
  });
});

describe("the dealbreaker model", () => {
  const dealbreaker = MODELS.dealbreaker.id;

  it("rules out an option carrying a con rated 10", () => {
    expect(
      compareDecisions({
        decisionA: "Stay",
        decisionB: "Leave",
        prosA: [{ text: "Stable team", weight: 1 }],
        consA: [],
        prosB: [{ text: "Higher salary", weight: 10 }],
        consB: [{ text: "Sell the house", weight: 10 }],
        model: dealbreaker,
      }),
    ).toEqual({
      kind: KIND.disqualified,
      winner: "Stay",
      loser: "Leave",
      dealbreakers: [{ text: "Sell the house", rating: 10 }],
    });
  });

  it("rules out an option even when it leads on points", () => {
    expect(
      compareDecisions({
        decisionA: "Stay",
        decisionB: "Leave",
        prosA: [{ text: "Stable team", weight: 1 }],
        consA: [],
        prosB: [
          { text: "Higher salary", weight: 10 },
          { text: "New city", weight: 10 },
        ],
        consB: [{ text: "Sell the house", weight: 10 }],
        model: dealbreaker,
      }).winner,
    ).toBe("Stay");
  });

  it("names every con that rules the option out", () => {
    expect(
      compareDecisions({
        decisionA: "Stay",
        decisionB: "Leave",
        prosA: [{ text: "Stable team", weight: 5 }],
        consA: [],
        prosB: [],
        consB: [
          { text: "Sell the house", weight: 10 },
          { text: "Long lease", weight: 10 },
          { text: "Long commute", weight: 8 },
        ],
        model: dealbreaker,
      }).dealbreakers,
    ).toEqual([
      { text: "Sell the house", rating: 10 },
      { text: "Long lease", rating: 10 },
    ]);
  });

  it("does not treat a pro rated 10 as a veto", () => {
    expect(
      compareDecisions({
        decisionA: "Stay",
        decisionB: "Leave",
        prosA: [{ text: "Stable team", weight: 4 }],
        consA: [],
        prosB: [{ text: "Higher salary", weight: 10 }],
        consB: [],
        model: dealbreaker,
      }),
    ).toMatchObject({ kind: KIND.lead, winner: "Leave" });
  });

  it("does not rule out an option over a blank row rated 10", () => {
    expect(
      compareDecisions({
        decisionA: "Stay",
        decisionB: "Leave",
        prosA: [{ text: "Stable team", weight: 4 }],
        consA: [],
        prosB: [{ text: "Higher salary", weight: 9 }],
        consB: [{ text: "   ", weight: 10 }],
        model: dealbreaker,
      }),
    ).toMatchObject({ kind: KIND.lead, winner: "Leave" });
  });

  it("scores on points when both options carry a dealbreaker", () => {
    expect(
      compareDecisions({
        decisionA: "Stay",
        decisionB: "Leave",
        prosA: [{ text: "Stable team", weight: 9 }],
        consA: [{ text: "Small flat", weight: 10 }],
        prosB: [{ text: "Higher salary", weight: 4 }],
        consB: [{ text: "Sell the house", weight: 10 }],
        model: dealbreaker,
      }),
    ).toMatchObject({ kind: KIND.lead, winner: "Stay", points: 5 });
  });

  it("counts every point the same when nothing is ruled out", () => {
    expect(
      compareDecisions({
        decisionA: "Stay",
        decisionB: "Leave",
        prosA: [{ text: "Stable team", weight: 9 }],
        consA: [],
        prosB: [
          { text: "Higher salary", weight: 5 },
          { text: "New city", weight: 5 },
        ],
        consB: [],
        model: dealbreaker,
      }),
    ).toMatchObject({ kind: KIND.lead, winner: "Leave", points: 1 });
  });

  it("treats a con rated 10 as weight, not a veto, under other models", () => {
    expect(
      compareDecisions({
        decisionA: "Stay",
        decisionB: "Leave",
        prosA: [{ text: "Stable team", weight: 1 }],
        consA: [],
        prosB: [{ text: "Higher salary", weight: 10 }],
        consB: [{ text: "Sell the house", weight: 10 }],
        model: MODELS.squared.id,
      }),
    ).toMatchObject({ kind: KIND.lead, winner: "Stay" });
  });
});
