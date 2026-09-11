import { beforeEach, describe, expect, it } from "vitest";
import { leadResult } from "../js/constants/strings.js";
import { MODELS } from "../js/scoring.js";
import {
  addConsideration,
  fillConsideration,
  loadApp,
  removeConsideration,
  setDecisionNames,
  selectScoringModel,
} from "./loadApp.js";

describe("add and remove rows", () => {
  beforeEach(() => {
    loadApp();
    selectScoringModel(MODELS.linear.id);
  });

  it("adds a pro without adding a con", () => {
    const consBefore = document.getElementsByClassName("consA").length;

    addConsideration("prosA");

    expect(document.getElementsByClassName("prosA").length).toBe(2);
    expect(document.getElementsByClassName("consA").length).toBe(consBefore);
  });

  it("lets one option have more cons than pros", () => {
    addConsideration("consA");
    addConsideration("consA");

    expect(document.getElementsByClassName("consA").length).toBe(3);
    expect(document.getElementsByClassName("prosA").length).toBe(1);
  });

  it("counts an added filled row", () => {
    setDecisionNames("Stay", "Leave");
    fillConsideration("prosA", 0, "Pay", 8);
    addConsideration("prosA");
    fillConsideration("prosA", 1, "Team", 3);
    globalThis.calculate();

    expect(document.getElementById("finalResult").textContent).toBe(
      leadResult("Stay", "Leave", 11, 100),
    );
  });

  it("stops counting a row after it is removed", () => {
    setDecisionNames("Stay", "Leave");
    fillConsideration("prosA", 0, "Pay", 8);
    addConsideration("prosA");
    fillConsideration("prosA", 1, "Team", 3);
    removeConsideration("prosA", 1);
    globalThis.calculate();

    expect(document.getElementById("finalResult").textContent).toBe(
      leadResult("Stay", "Leave", 8, 100),
    );
  });

  it("keeps the last row of a list", () => {
    setDecisionNames("Stay", "Leave");
    fillConsideration("prosA", 0, "Pay", 8);
    removeConsideration("prosA", 0);
    globalThis.calculate();

    expect(document.getElementsByClassName("prosA").length).toBe(1);
    expect(document.getElementById("finalResult").textContent).toBe(
      leadResult("Stay", "Leave", 8, 100),
    );
  });

  it("does not offer remove on a list's only row", () => {
    const remove = document
      .getElementsByClassName("prosA")[0]
      .closest(".consideration-row")
      .querySelector(".remove-row");

    expect(remove.hidden).toBe(true);
  });

  it("offers remove after a second row is added", () => {
    addConsideration("prosA");

    const first = document
      .getElementsByClassName("prosA")[0]
      .closest(".consideration-row")
      .querySelector(".remove-row");
    const second = document
      .getElementsByClassName("prosA")[1]
      .closest(".consideration-row")
      .querySelector(".remove-row");

    expect(first.hidden).toBe(false);
    expect(second.hidden).toBe(false);
  });

  it("hides remove again after returning to one row", () => {
    addConsideration("prosA");
    removeConsideration("prosA", 1);

    const remaining = document
      .getElementsByClassName("prosA")[0]
      .closest(".consideration-row")
      .querySelector(".remove-row");

    expect(document.getElementsByClassName("prosA").length).toBe(1);
    expect(remaining.hidden).toBe(true);
  });

  it("restores the default empty rows on reset", () => {
    const defaultPros = document.getElementsByClassName("prosA").length;
    addConsideration("prosA");
    addConsideration("prosA");
    fillConsideration("prosA", 0, "Pay", 8);

    document.querySelector("form").reset();
    globalThis.resetSliders();

    expect(document.getElementsByClassName("prosA").length).toBe(defaultPros);
    expect(document.getElementsByClassName("consA").length).toBe(defaultPros);
    expect(document.getElementsByClassName("prosB").length).toBe(defaultPros);
    expect(document.getElementsByClassName("consB").length).toBe(defaultPros);
    expect(document.getElementsByClassName("prosA")[0].value).toBe("0");
  });

  it("updates the label on an added row while the slider is dragged", () => {
    addConsideration("prosA");
    const slider = document.getElementsByClassName("prosA")[1];
    const label = slider.parentElement.querySelector(".sliderStatus");

    slider.value = "5";
    slider.dispatchEvent(new Event("input", { bubbles: true }));

    expect(label.textContent).toBe("5");
  });
});
