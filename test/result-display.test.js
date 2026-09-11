import { beforeEach, describe, expect, it } from "vitest";
import {
  fillConsideration,
  loadApp,
  selectScoringModel,
  setDecisionNames,
} from "./loadApp.js";
import { MODELS } from "../js/scoring.js";

function resultLines() {
  return [...document.querySelectorAll("#finalResult .result-line")].map(
    (line) => line.textContent,
  );
}

describe("the result", () => {
  beforeEach(() => {
    loadApp();
    selectScoringModel(MODELS.linear.id);
    setDecisionNames("Stay", "Leave");
  });

  it("shows how decisive the lead is alongside it", () => {
    fillConsideration("prosA", 0, "Near family", 5);
    fillConsideration("prosB", 0, "Higher salary", 2);
    globalThis.calculate();

    // A 3 point lead out of the 7 points entered.
    expect(resultLines()[0]).toContain("43%");
  });

  it("puts each part of the verdict on its own line", () => {
    fillConsideration("prosA", 0, "Near family", 5);
    fillConsideration("prosB", 0, "Higher salary", 2);
    globalThis.calculate();

    expect(resultLines()).toHaveLength(1);
    expect(resultLines()[0]).toContain("Stay");
  });

  it("replaces the previous lines when calculated again", () => {
    fillConsideration("prosA", 0, "Near family", 5);
    fillConsideration("prosB", 0, "Higher salary", 2);
    globalThis.calculate();
    globalThis.calculate();

    expect(resultLines()).toHaveLength(1);
  });

  it("clears every line on reset", () => {
    fillConsideration("prosA", 0, "Near family", 5);
    fillConsideration("prosB", 0, "Higher salary", 2);
    globalThis.calculate();

    globalThis.resetSliders();

    expect(resultLines()).toEqual([]);
    expect(document.getElementById("finalResult").textContent).toBe("");
  });

  it("shows a tie as a single line", () => {
    fillConsideration("prosA", 0, "Near family", 5);
    fillConsideration("prosB", 0, "Higher salary", 5);
    globalThis.calculate();

    expect(resultLines()).toHaveLength(1);
  });
});
