import { beforeEach, describe, expect, it } from "vitest";
import {
  considerationFieldError,
  considerationTextInput,
  fillConsideration,
  loadApp,
  moveSlider,
  ratingField,
  selectScoringModel,
  setDecisionNames,
  typeRating,
  verdictLine,
} from "./loadApp.js";
import { MODELS } from "../js/scoring.js";
import { BLANK_PRO_ERROR } from "../js/constants/strings.js";

describe("the rating field", () => {
  beforeEach(() => {
    loadApp();
    selectScoringModel(MODELS.linear.id);
  });

  it("takes a number the user can type", () => {
    expect(ratingField("prosA", 0).type).toBe("number");
  });

  it("shows the rating when the slider moves", () => {
    moveSlider("prosA", 0, 7);

    expect(ratingField("prosA", 0).value).toBe("7");
  });

  it("moves the slider when a rating is typed", () => {
    typeRating("prosA", 0, 7);

    expect(document.getElementsByClassName("prosA")[0].value).toBe("7");
  });

  it("holds a typed rating above the scale at the top of the scale", () => {
    typeRating("prosA", 0, 12);

    expect(document.getElementsByClassName("prosA")[0].value).toBe("10");
    expect(ratingField("prosA", 0).value).toBe("10");
  });

  it("holds a typed rating below the scale at the bottom of the scale", () => {
    typeRating("prosA", 0, -3);

    expect(document.getElementsByClassName("prosA")[0].value).toBe("0");
    expect(ratingField("prosA", 0).value).toBe("0");
  });

  it("counts a typed rating in the score", () => {
    setDecisionNames("Stay", "Leave");
    considerationTextInput("prosA", 0).value = "Stable team";
    typeRating("prosA", 0, 8);
    fillConsideration("prosB", 0, "Higher salary", 2);
    globalThis.calculate();

    expect(verdictLine()).toContain("Stay");
    expect(verdictLine()).toContain("6 points");
  });

  it("warns when a rating is typed on a row with no text", () => {
    typeRating("prosA", 0, 5);

    expect(considerationFieldError("prosA", 0).textContent).toBe(
      BLANK_PRO_ERROR,
    );
  });

  it("returns to 0 on reset", () => {
    typeRating("prosA", 0, 9);

    globalThis.resetSliders();

    expect(ratingField("prosA", 0).value).toBe("0");
  });
});
