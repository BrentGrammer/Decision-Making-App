import { beforeEach, describe, expect, it } from "vitest";
import { fillConsideration, loadApp } from "./loadApp.js";

describe("test harness", () => {
  beforeEach(() => {
    loadApp();
  });

  it("loads the page script onto window", () => {
    expect(typeof globalThis.calculate).toBe("function");
    expect(typeof globalThis.sumFilledWeights).toBe("function");
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

  it("ignores a dragged slider when the pro/con text is blank", () => {
    const slider = document.getElementsByClassName("prosA")[0];
    slider.value = "10";
    expect(globalThis.sumFilledWeights(document.getElementsByClassName("prosA"))).toBe(0);
  });

  it("ignores whitespace-only text", () => {
    fillConsideration("prosA", 0, "   ", 10);
    expect(globalThis.sumFilledWeights(document.getElementsByClassName("prosA"))).toBe(0);
  });

  it("counts a filled consideration at its slider weight", () => {
    fillConsideration("prosA", 0, "Higher pay", 8);
    expect(globalThis.sumFilledWeights(document.getElementsByClassName("prosA"))).toBe(8);
  });

  it("counts a filled consideration with weight 0 as 0", () => {
    fillConsideration("consB", 0, "Longer commute", 0);
    expect(globalThis.sumFilledWeights(document.getElementsByClassName("consB"))).toBe(0);
  });
});

describe("reset", () => {
  it.todo("restores slider values and Current Value labels to 0");
});
