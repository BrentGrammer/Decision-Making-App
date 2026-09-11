import { beforeEach, describe, expect, it } from "vitest";
import {
  fillConsideration,
  loadApp,
  resultLines,
  selectScoringModel,
  setDecisionNames,
} from "./loadApp.js";
import { MODELS } from "../js/scoring.js";

describe("the result", () => {
  beforeEach(() => {
    loadApp();
    selectScoringModel(MODELS.linear.id);
    setDecisionNames("Stay", "Leave");
  });

  it("shows how decisive the lead is alongside it", () => {
    fillConsideration("prosA", 0, "Stable team", 5);
    fillConsideration("prosB", 0, "Higher salary", 2);
    globalThis.calculate();

    // A 3 point lead out of the 7 points entered.
    expect(resultLines()[0]).toContain("43%");
  });

  it("puts each part of the verdict on its own line", () => {
    fillConsideration("prosA", 0, "Stable team", 5);
    fillConsideration("prosB", 0, "Higher salary", 2);
    globalThis.calculate();

    expect(resultLines()).toHaveLength(2);
    expect(resultLines()[0]).toContain("Stay");
  });

  it("names the rows that drove the result", () => {
    fillConsideration("prosA", 0, "Stable team", 5);
    fillConsideration("prosB", 0, "Higher salary", 2);
    globalThis.calculate();

    expect(resultLines()[1]).toContain("Stable team");
    expect(resultLines()[1]).toContain("Higher salary");
  });

  it("replaces the previous lines when calculated again", () => {
    fillConsideration("prosA", 0, "Stable team", 5);
    fillConsideration("prosB", 0, "Higher salary", 2);
    globalThis.calculate();
    globalThis.calculate();

    expect(resultLines()).toHaveLength(2);
  });

  it("clears every line on reset", () => {
    fillConsideration("prosA", 0, "Stable team", 5);
    fillConsideration("prosB", 0, "Higher salary", 2);
    globalThis.calculate();

    globalThis.resetSliders();

    expect(resultLines()).toEqual([]);
    expect(document.getElementById("finalResult").textContent).toBe("");
  });

  it("shows a tie as a single line", () => {
    fillConsideration("prosA", 0, "Stable team", 5);
    fillConsideration("prosB", 0, "Higher salary", 5);
    globalThis.calculate();

    expect(resultLines()).toHaveLength(1);
  });
});
