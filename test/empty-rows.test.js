import { beforeEach, describe, expect, it } from "vitest";
import { fillConsideration, loadApp, setDecisionNames } from "./loadApp.js";

describe("test harness", () => {
  beforeEach(() => {
    loadApp();
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
  });

  it("does not let a blank row change the result", () => {
    setDecisionNames("Stay", "Leave");
    document.getElementsByClassName("prosA")[0].value = "10";
    globalThis.calculate();

    expect(document.getElementById("finalResult").textContent).toMatch(/equally/i);
  });
});

describe("reset", () => {
  beforeEach(() => {
    loadApp();
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
    expect(document.getElementById("finalResult").textContent).toMatch(
      /Stay is better than Leave/,
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
    setDecisionNames("Stay", "Leave");
  });

  it("replaces a previous lead with a tie message when scores are equal", () => {
    fillConsideration("prosA", 0, "Pay", 8);
    fillConsideration("prosB", 0, "Growth", 3);
    globalThis.calculate();

    fillConsideration("prosB", 0, "Growth", 8);
    globalThis.calculate();

    const result = document.getElementById("finalResult").textContent;
    expect(result).toMatch(/equally/i);
    expect(result).not.toMatch(/leads/i);
  });

  it("still shows a lead after a previous tie", () => {
    fillConsideration("prosA", 0, "Pay", 5);
    fillConsideration("prosB", 0, "Growth", 5);
    globalThis.calculate();

    fillConsideration("prosA", 0, "Pay", 9);
    globalThis.calculate();

    expect(document.getElementById("finalResult").textContent).toBe(
      "RESULT: Stay is better than Leave by 4 points.",
    );
  });
});

describe("decision names", () => {
  beforeEach(() => {
    loadApp();
  });

  it("does not treat missing names as undefined", () => {
    fillConsideration("prosA", 0, "Pay", 8);
    globalThis.calculate();

    const result = document.getElementById("finalResult").textContent;
    expect(result).not.toMatch(/undefined/i);
    expect(result).toBe("RESULT: Enter both decision names first.");
  });

  it("uses names typed into the decision fields", () => {
    document.getElementById("A").value = "Stay";
    document.getElementById("B").value = "Leave";
    fillConsideration("prosA", 0, "Pay", 8);
    globalThis.calculate();

    expect(document.getElementById("finalResult").textContent).toBe(
      "RESULT: Stay is better than Leave by 8 points.",
    );
  });

  it("uses the names from the table, not leftover globals", () => {
    globalThis.decisionA = "Wrong A";
    globalThis.decisionB = "Wrong B";
    setDecisionNames("Stay", "Leave");
    fillConsideration("prosA", 0, "Pay", 8);
    globalThis.calculate();

    expect(document.getElementById("finalResult").textContent).toBe(
      "RESULT: Stay is better than Leave by 8 points.",
    );
  });

  it("uses typed names as text, not HTML", () => {
    setDecisionNames("Stay", "<img src=x>");
    fillConsideration("prosA", 0, "Pay", 8);
    globalThis.calculate();

    expect(document.querySelector("#finalResult img")).toBeNull();
    expect(document.getElementById("finalResult").textContent).toBe(
      "RESULT: Stay is better than <img src=x> by 8 points.",
    );
  });

  it("accepts names of one character", () => {
    setDecisionNames("A", "B");
    fillConsideration("prosA", 0, "Pay", 8);
    globalThis.calculate();

    expect(document.getElementById("finalResult").textContent).toBe(
      "RESULT: A is better than B by 8 points.",
    );
    expect(document.getElementById("A").getAttribute("aria-invalid")).not.toBe(
      "true",
    );
    expect(document.getElementById("B").getAttribute("aria-invalid")).not.toBe(
      "true",
    );
  });

  it("accepts names of 50 characters", () => {
    const decisionA = "a".repeat(50);
    const decisionB = "b".repeat(50);
    setDecisionNames(decisionA, decisionB);
    fillConsideration("prosA", 0, "Pay", 8);
    globalThis.calculate();

    expect(document.getElementById("finalResult").textContent).toBe(
      `RESULT: ${decisionA} is better than ${decisionB} by 8 points.`,
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
      "Enter a name (1–50 characters).",
    );
    expect(document.getElementById("B-error").textContent).toBe(
      "Enter a name (1–50 characters).",
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
      "Enter a name (1–50 characters).",
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
      "RESULT: Enter both decision names first.",
    );
  });

  it("shows a field error when a name is longer than 50 characters", () => {
    setDecisionNames("Stay", "x".repeat(51));
    fillConsideration("prosA", 0, "Pay", 8);
    globalThis.calculate();

    expect(document.getElementById("B").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(document.getElementById("B-error").hidden).toBe(false);
    expect(document.getElementById("B-error").textContent).toBe(
      "Enter a name (1–50 characters).",
    );
    expect(document.getElementById("finalResult").textContent).toBe(
      "RESULT: Each decision name must be 1–50 characters.",
    );
  });

  it("shows a field error when a name is left blank", () => {
    const inputA = document.getElementById("A");
    inputA.dispatchEvent(new Event("blur", { bubbles: true }));

    expect(inputA.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById("A-error").textContent).toBe(
      "Enter a name (1–50 characters).",
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
