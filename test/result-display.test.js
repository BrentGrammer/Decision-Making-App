import { beforeEach, describe, expect, it } from "vitest";
import {
  contributorGroups,
  contributorShares,
  contributorsCaption,
  fillConsideration,
  loadApp,
  resultLines,
  selectScoringModel,
  setDecisionNames,
} from "./loadApp.js";
import { CONSIDERATION_TYPE, MODELS } from "../js/scoring.js";
import {
  CONSIDERATION_TYPE_LABELS,
  CONTRIBUTORS_CAPTION,
  CONTRIBUTORS_HINT,
  CONTRIBUTORS_HINT_LABEL,
  inFavorOf,
  sharePercent,
} from "../js/constants/strings.js";

function fillOnePerSide() {
  fillConsideration("prosA", 0, "Stable team", 5);
  fillConsideration("prosB", 0, "Higher salary", 2);
}

describe("the result", () => {
  beforeEach(() => {
    loadApp();
    selectScoringModel(MODELS.linear.id);
    setDecisionNames("Stay", "Leave");
  });

  it("shows how decisive the lead is alongside it", () => {
    fillOnePerSide();
    globalThis.calculate();

    // A 3 point lead out of the 7 points entered.
    expect(resultLines()[0]).toContain("43%");
  });

  it("states the verdict in a single line", () => {
    fillOnePerSide();
    globalThis.calculate();

    expect(resultLines()).toHaveLength(1);
    expect(resultLines()[0]).toContain("Stay");
  });

  it("replaces the previous result when calculated again", () => {
    fillOnePerSide();
    globalThis.calculate();
    globalThis.calculate();

    expect(resultLines()).toHaveLength(1);
    expect(contributorGroups()).toHaveLength(2);
  });

  it("clears the verdict and the table on reset", () => {
    fillOnePerSide();
    globalThis.calculate();

    globalThis.resetSliders();

    expect(resultLines()).toEqual([]);
    expect(contributorGroups()).toEqual([]);
    expect(document.getElementById("finalResult").textContent).toBe("");
  });

  it("shows a tie as a line with no table", () => {
    fillConsideration("prosA", 0, "Stable team", 5);
    fillConsideration("prosB", 0, "Higher salary", 5);
    globalThis.calculate();

    expect(resultLines()).toHaveLength(1);
    expect(contributorGroups()).toEqual([]);
  });
});

describe("the contributors table", () => {
  beforeEach(() => {
    loadApp();
    selectScoringModel(MODELS.linear.id);
    setDecisionNames("Stay", "Leave");
  });

  it("labels what the table is", () => {
    fillOnePerSide();
    globalThis.calculate();

    expect(contributorsCaption().textContent).toContain(CONTRIBUTORS_CAPTION);
  });

  it("explains the table in a hint on the label", () => {
    fillOnePerSide();
    globalThis.calculate();

    const hint = contributorsCaption().querySelector(".hint");

    expect(hint.getAttribute("aria-label")).toBe(CONTRIBUTORS_HINT_LABEL);
    expect(hint.querySelector(".hint-text").textContent).toBe(
      CONTRIBUTORS_HINT,
    );
  });

  it("groups the rows under a heading per decision", () => {
    fillOnePerSide();
    globalThis.calculate();

    expect(contributorGroups().map((group) => group.heading)).toEqual([
      inFavorOf("Stay"),
      inFavorOf("Leave"),
    ]);
  });

  it("shows the decision, type, text and rating of each row", () => {
    fillOnePerSide();
    globalThis.calculate();

    expect(contributorGroups()[0].rows).toEqual([
      {
        option: "Stay",
        type: CONSIDERATION_TYPE_LABELS[CONSIDERATION_TYPE.pro],
        text: "Stable team",
        rating: "5",
      },
    ]);
  });

  it("reports the rating the user gave, not the model's weight", () => {
    selectScoringModel(MODELS.squared.id);
    fillOnePerSide();
    globalThis.calculate();

    expect(contributorGroups()[0].rows[0].rating).toBe("5");
  });

  it("names the loser's con as a con of the loser", () => {
    fillConsideration("prosA", 0, "Stable team", 2);
    fillConsideration("consB", 0, "Long commute", 6);
    globalThis.calculate();

    expect(contributorGroups()[0].rows).toEqual([
      {
        option: "Leave",
        type: CONSIDERATION_TYPE_LABELS[CONSIDERATION_TYPE.con],
        text: "Long commute",
        rating: "6",
      },
      {
        option: "Stay",
        type: CONSIDERATION_TYPE_LABELS[CONSIDERATION_TYPE.pro],
        text: "Stable team",
        rating: "2",
      },
    ]);
  });

  it("shows only the winner's group when nothing favours the loser", () => {
    fillConsideration("prosA", 0, "Stable team", 5);
    fillConsideration("consB", 0, "Long commute", 4);
    globalThis.calculate();

    expect(contributorGroups().map((group) => group.heading)).toEqual([
      inFavorOf("Stay"),
    ]);
  });

  it("says how much of all the points entered each row accounts for", () => {
    fillOnePerSide();
    globalThis.calculate();

    expect(contributorShares()).toEqual([
      { text: "Stable team", share: sharePercent(71) },
      { text: "Higher salary", share: sharePercent(29) },
    ]);
  });

  it("raises the top row's share under a steeper model", () => {
    selectScoringModel(MODELS.doubling.id);
    fillOnePerSide();
    globalThis.calculate();

    expect(contributorShares()).toEqual([
      { text: "Stable team", share: sharePercent(89) },
      { text: "Higher salary", share: sharePercent(11) },
    ]);
  });

  it("shows no table for a disqualified option", () => {
    selectScoringModel(MODELS.dealbreaker.id);
    fillConsideration("prosA", 0, "Stable team", 5);
    fillConsideration("consB", 0, "Sell the car", 10);
    globalThis.calculate();

    expect(resultLines()).toHaveLength(1);
    expect(contributorGroups()).toEqual([]);
  });
});
