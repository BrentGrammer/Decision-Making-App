import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BLANK_CON_ERROR,
  BLANK_PRO_ERROR,
  DECISION_NAME_FIELD_ERROR,
  leadResult,
  MISSING_NAMES_RESULT,
  NAME_LENGTH_RESULT,
  TIE_RESULT,
} from "../js/constants/strings.js";
import { DECISION_NAME_MAX_LENGTH, MODELS } from "../js/scoring.js";
import {
  considerationFieldError,
  considerationTextInput,
  fillConsideration,
  loadApp,
  setDecisionNames,
  selectScoringModel,
} from "./loadApp.js";

describe("test harness", () => {
  beforeEach(() => {
    loadApp();
    selectScoringModel(MODELS.linear.id);
  });

  it("loads the page script onto window", () => {
    expect(typeof globalThis.calculate).toBe("function");
    expect(typeof globalThis.resetSliders).toBe("function");
  });

  it("starts sliders at 0", () => {
    const sliders = document.getElementsByClassName("sliders");
    expect(sliders.length).toBeGreaterThan(0);
    for (let i = 0; i < sliders.length; i++) {
      expect(sliders[i].value).toBe("0");
    }
  });
});

describe("empty rows do not count", () => {
  beforeEach(() => {
    loadApp();
    selectScoringModel(MODELS.linear.id);
  });

  it("does not let a blank row change the result", () => {
    setDecisionNames("Stay", "Leave");
    document.getElementsByClassName("prosA")[0].value = "10";
    globalThis.calculate();

    expect(document.getElementById("finalResult").textContent).toBe(TIE_RESULT);
  });

  it("warns that a moved slider with no text will not count", () => {
    setDecisionNames("Stay", "Leave");
    document.getElementsByClassName("prosA")[0].value = "10";
    globalThis.calculate();

    expect(considerationTextInput("prosA", 0).getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(considerationFieldError("prosA", 0).hidden).toBe(false);
    expect(considerationFieldError("prosA", 0).textContent).toBe(BLANK_PRO_ERROR);
    expect(document.getElementById("finalResult").textContent).toBe(TIE_RESULT);
  });

  it("warns while dragging a slider on a blank pro", () => {
    const slider = document.getElementsByClassName("prosA")[0];
    slider.value = "7";
    slider.dispatchEvent(new Event("input", { bubbles: true }));

    expect(considerationTextInput("prosA", 0).getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(considerationFieldError("prosA", 0).textContent).toBe(BLANK_PRO_ERROR);
  });

  it("uses con copy for a blank con with a moved slider", () => {
    const slider = document.getElementsByClassName("consA")[0];
    slider.value = "4";
    slider.dispatchEvent(new Event("input", { bubbles: true }));

    expect(considerationFieldError("consA", 0).textContent).toBe(BLANK_CON_ERROR);
  });

  it("clears the warning when the user enters text", () => {
    const slider = document.getElementsByClassName("prosA")[0];
    slider.value = "7";
    slider.dispatchEvent(new Event("input", { bubbles: true }));

    const textInput = considerationTextInput("prosA", 0);
    textInput.value = "Pay";
    textInput.dispatchEvent(new Event("input", { bubbles: true }));

    expect(textInput.getAttribute("aria-invalid")).not.toBe("true");
    expect(considerationFieldError("prosA", 0).textContent).toBe("");
  });

  it("does not warn when the slider is still at 0", () => {
    globalThis.calculate();

    expect(
      considerationTextInput("prosA", 0).getAttribute("aria-invalid"),
    ).not.toBe("true");
    expect(considerationFieldError("prosA", 0).textContent).toBe("");
  });

  it("treats whitespace-only text like a blank row", () => {
    setDecisionNames("Stay", "Leave");
    fillConsideration("prosA", 0, "   ", 10);
    globalThis.calculate();

    expect(document.getElementById("finalResult").textContent).toBe(TIE_RESULT);
    expect(considerationFieldError("prosA", 0).textContent).toBe(BLANK_PRO_ERROR);
  });
});

describe("reset", () => {
  beforeEach(() => {
    loadApp();
    selectScoringModel(MODELS.linear.id);
  });

  it("restores slider values and Current Value labels to 0", () => {
    const sliders = document.getElementsByClassName("sliders");
    const labels = document.getElementsByClassName("sliderStatus");

    sliders[0].value = "8";
    labels[0].textContent = "8";
    sliders[3].value = "4";
    labels[3].textContent = "4";

    document.querySelector("form").reset();
    globalThis.resetSliders();

    expect(sliders.length).toBe(labels.length);
    for (let i = 0; i < sliders.length; i++) {
      expect(sliders[i].value).toBe("0");
      expect(labels[i].textContent).toBe("0");
    }
  });

  it("clears a previous result", () => {
    setDecisionNames("Stay", "Leave");
    fillConsideration("prosA", 0, "Pay", 8);
    globalThis.calculate();
    expect(document.getElementById("finalResult").textContent).toBe(
      leadResult("Stay", "Leave", 8, 100),
    );

    document.querySelector("form").reset();
    globalThis.resetSliders();

    expect(document.getElementById("finalResult").textContent).toBe("");
  });

  it("clears decision names", () => {
    setDecisionNames("Stay", "Leave");

    document.querySelector("form").reset();
    globalThis.resetSliders();

    expect(document.getElementById("A").value).toBe("");
    expect(document.getElementById("B").value).toBe("");
  });

  it("clears name field errors", () => {
    globalThis.calculate();

    expect(document.getElementById("A").getAttribute("aria-invalid")).toBe(
      "true",
    );

    document.querySelector("form").reset();
    globalThis.resetSliders();

    expect(document.getElementById("A").getAttribute("aria-invalid")).not.toBe(
      "true",
    );
    expect(document.getElementById("A-error").textContent).toBe("");
    expect(document.getElementById("B-error").textContent).toBe("");
  });
});

describe("ties", () => {
  beforeEach(() => {
    loadApp();
    selectScoringModel(MODELS.linear.id);
    setDecisionNames("Stay", "Leave");
  });

  it("replaces a previous lead with a tie message when scores are equal", () => {
    fillConsideration("prosA", 0, "Pay", 8);
    fillConsideration("prosB", 0, "Growth", 3);
    globalThis.calculate();

    fillConsideration("prosB", 0, "Growth", 8);
    globalThis.calculate();

    const result = document.getElementById("finalResult").textContent;
    expect(result).toBe(TIE_RESULT);
  });

  it("still shows a lead after a previous tie", () => {
    fillConsideration("prosA", 0, "Pay", 5);
    fillConsideration("prosB", 0, "Growth", 5);
    globalThis.calculate();

    fillConsideration("prosA", 0, "Pay", 9);
    globalThis.calculate();

    expect(document.getElementById("finalResult").textContent).toBe(
      leadResult("Stay", "Leave", 4, 29),
    );
  });
});

describe("decision names", () => {
  beforeEach(() => {
    loadApp();
    selectScoringModel(MODELS.linear.id);
  });

  it("does not treat missing names as undefined", () => {
    fillConsideration("prosA", 0, "Pay", 8);
    globalThis.calculate();

    const result = document.getElementById("finalResult").textContent;
    expect(result).not.toMatch(/undefined/i);
    expect(result).toBe(MISSING_NAMES_RESULT);
  });

  it("uses names typed into the decision fields", () => {
    document.getElementById("A").value = "Stay";
    document.getElementById("B").value = "Leave";
    fillConsideration("prosA", 0, "Pay", 8);
    globalThis.calculate();

    expect(document.getElementById("finalResult").textContent).toBe(
      leadResult("Stay", "Leave", 8, 100),
    );
  });

  it("scrolls the result into view after calculate", () => {
    setDecisionNames("Stay", "Leave");
    fillConsideration("prosA", 0, "Pay", 8);
    const result = document.getElementById("finalResult");
    result.scrollIntoView = vi.fn();

    globalThis.calculate();

    expect(result.scrollIntoView).toHaveBeenCalled();
  });

  it("uses the names from the table, not leftover globals", () => {
    globalThis.decisionA = "Wrong A";
    globalThis.decisionB = "Wrong B";
    setDecisionNames("Stay", "Leave");
    fillConsideration("prosA", 0, "Pay", 8);
    globalThis.calculate();

    expect(document.getElementById("finalResult").textContent).toBe(
      leadResult("Stay", "Leave", 8, 100),
    );
  });

  it("uses typed names as text, not HTML", () => {
    setDecisionNames("Stay", "<img src=x>");
    fillConsideration("prosA", 0, "Pay", 8);
    globalThis.calculate();

    expect(document.querySelector("#finalResult img")).toBeNull();
    expect(document.getElementById("finalResult").textContent).toBe(
      leadResult("Stay", "<img src=x>", 8, 100),
    );
  });

  it("accepts names of one character", () => {
    setDecisionNames("A", "B");
    fillConsideration("prosA", 0, "Pay", 8);
    globalThis.calculate();

    expect(document.getElementById("finalResult").textContent).toBe(
      leadResult("A", "B", 8, 100),
    );
    expect(document.getElementById("A").getAttribute("aria-invalid")).not.toBe(
      "true",
    );
    expect(document.getElementById("B").getAttribute("aria-invalid")).not.toBe(
      "true",
    );
  });

  it("accepts names at the maximum length", () => {
    const decisionA = "a".repeat(DECISION_NAME_MAX_LENGTH);
    const decisionB = "b".repeat(DECISION_NAME_MAX_LENGTH);
    setDecisionNames(decisionA, decisionB);
    fillConsideration("prosA", 0, "Pay", 8);
    globalThis.calculate();

    expect(document.getElementById("finalResult").textContent).toBe(
      leadResult(decisionA, decisionB, 8, 100),
    );
    expect(document.getElementById("A").getAttribute("aria-invalid")).not.toBe(
      "true",
    );
  });

  it("shows field errors when names are missing", () => {
    fillConsideration("prosA", 0, "Pay", 8);
    globalThis.calculate();

    expect(document.getElementById("A").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(document.getElementById("B").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(document.getElementById("A-error").hidden).toBe(false);
    expect(document.getElementById("A-error").textContent).toBe(
      DECISION_NAME_FIELD_ERROR,
    );
    expect(document.getElementById("B-error").textContent).toBe(
      DECISION_NAME_FIELD_ERROR,
    );
  });

  it("marks only the invalid name", () => {
    setDecisionNames("Stay", "");
    fillConsideration("prosA", 0, "Pay", 8);
    globalThis.calculate();

    expect(document.getElementById("A").getAttribute("aria-invalid")).not.toBe(
      "true",
    );
    expect(document.getElementById("B").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(document.getElementById("B-error").textContent).toBe(
      DECISION_NAME_FIELD_ERROR,
    );
  });

  it("treats whitespace-only names as missing", () => {
    setDecisionNames("   ", "Leave");
    fillConsideration("prosA", 0, "Pay", 8);
    globalThis.calculate();

    expect(document.getElementById("A").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(document.getElementById("finalResult").textContent).toBe(
      MISSING_NAMES_RESULT,
    );
  });

  it("shows a field error when a name is longer than the maximum", () => {
    setDecisionNames("Stay", "x".repeat(DECISION_NAME_MAX_LENGTH + 1));
    fillConsideration("prosA", 0, "Pay", 8);
    globalThis.calculate();

    expect(document.getElementById("B").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(document.getElementById("B-error").hidden).toBe(false);
    expect(document.getElementById("B-error").textContent).toBe(
      DECISION_NAME_FIELD_ERROR,
    );
    expect(document.getElementById("finalResult").textContent).toBe(
      NAME_LENGTH_RESULT,
    );
  });

  it("shows a field error when a name is left blank", () => {
    const inputA = document.getElementById("A");
    inputA.dispatchEvent(new Event("blur", { bubbles: true }));

    expect(inputA.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById("A-error").textContent).toBe(
      DECISION_NAME_FIELD_ERROR,
    );
  });

  it("clears the field error when the name becomes valid", () => {
    const inputA = document.getElementById("A");
    inputA.dispatchEvent(new Event("blur", { bubbles: true }));
    inputA.value = "Stay";
    inputA.dispatchEvent(new Event("input", { bubbles: true }));

    expect(inputA.getAttribute("aria-invalid")).not.toBe("true");
    expect(document.getElementById("A-error").textContent).toBe("");
  });
});

describe("slider labels", () => {
  beforeEach(() => {
    loadApp();
    selectScoringModel(MODELS.linear.id);
  });

  it("updates Current Value beside the slider that moved", () => {
    const extra = document.createElement("span");
    extra.className = "sliderStatus";
    extra.textContent = "9";
    document.body.prepend(extra);

    const slider = document.getElementsByClassName("sliders")[2];
    const labelBeside = slider.parentElement.querySelector(".sliderStatus");

    slider.value = "6";
    globalThis.sliderChange(slider);

    expect(labelBeside.textContent).toBe("6");
    expect(extra.textContent).toBe("9");
  });

  it("updates Current Value while the slider is being dragged", () => {
    const slider = document.getElementsByClassName("sliders")[0];
    const label = slider.parentElement.querySelector(".sliderStatus");

    slider.value = "7";
    slider.dispatchEvent(new Event("input", { bubbles: true }));

    expect(label.textContent).toBe("7");
  });
});
