import { beforeEach, describe, expect, it, vi } from "vitest";
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

    expect(document.getElementById("A").textContent).toBe("");
    expect(document.getElementById("B").textContent).toBe("");
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

  it("writes prompt names as text, not HTML", () => {
    vi.spyOn(window, "prompt")
      .mockReturnValueOnce("Stay")
      .mockReturnValueOnce("<img src=x>");

    globalThis.start();

    const cellB = document.getElementById("B");
    expect(cellB.querySelector("img")).toBeNull();
    expect(cellB.textContent).toBe("<img src=x>");
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
