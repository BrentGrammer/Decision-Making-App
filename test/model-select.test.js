import { beforeEach, describe, expect, it } from "vitest";
import {
  fillConsideration,
  loadApp,
  selectScoringModel as chooseModel,
  setDecisionNames,
} from "./loadApp.js";
import { MODEL_HINTS, MODEL_LABELS } from "../js/constants/strings.js";
import { MODELS } from "../js/scoring.js";

function modelSelect() {
  return document.getElementById("model");
}

function resultText() {
  return document.getElementById("finalResult").textContent;
}

function hintText() {
  return document.getElementById("model-hint").textContent;
}

// The result sentence is rewritten in later steps, so tests read only who the
// result announces as the winner: the winner is named ahead of the loser.
function announcedWinner() {
  const text = resultText();
  const positions = ["Stay", "Leave"]
    .map((name) => [name, text.indexOf(name)])
    .filter(([, at]) => at >= 0)
    .sort((one, other) => one[1] - other[1]);
  return positions.length === 2 ? positions[0][0] : null;
}

// One 10 beats three 4s under squared (100 > 48); three 4s win under linear
// (12 > 10). So the announced winner says which model was used.
function fillModelSensitiveDecision() {
  setDecisionNames("Stay", "Leave");
  fillConsideration("prosA", 0, "Near family", 10);
  for (const [index, text] of ["Higher salary", "New city", "Shorter commute"].entries()) {
    if (index > 0) {
      document.querySelector('.add-row[data-group="prosB"]').click();
    }
    fillConsideration("prosB", index, text, 4);
  }
}

function calculate() {
  globalThis.calculate();
}

describe("scoring model selection", () => {
  beforeEach(() => {
    loadApp();
  });

  it("offers every scoring model by name", () => {
    const options = [...modelSelect().options].map((option) => ({
      value: option.value,
      label: option.textContent,
    }));

    expect(options).toEqual(
      Object.values(MODELS).map((model) => ({
        value: model.id,
        label: MODEL_LABELS[model.id],
      })),
    );
  });

  it("weighs big ratings more heavily than small ones before any choice is made", () => {
    fillModelSensitiveDecision();
    calculate();

    expect(announcedWinner()).toBe("Stay");
  });

  it("counts every point the same when linear is chosen", () => {
    fillModelSensitiveDecision();
    chooseModel(MODELS.linear.id);
    calculate();

    expect(announcedWinner()).toBe("Leave");
  });

  it("scores a 10 far above a 9 when doubling is chosen", () => {
    setDecisionNames("Stay", "Leave");
    fillConsideration("prosA", 0, "Near family", 10);
    fillConsideration("prosB", 0, "Higher salary", 9);
    document.querySelector('.add-row[data-group="prosB"]').click();
    fillConsideration("prosB", 1, "New city", 8);
    chooseModel(MODELS.doubling.id);
    calculate();

    expect(announcedWinner()).toBe("Stay");
  });

  it("keeps a showing result while the user browses other models", () => {
    fillModelSensitiveDecision();
    chooseModel(MODELS.linear.id);
    calculate();
    expect(announcedWinner()).toBe("Leave");

    chooseModel(MODELS.squared.id);

    expect(announcedWinner()).toBe("Leave");
  });

  it("re-scores with the chosen model on the next calculate", () => {
    fillModelSensitiveDecision();
    chooseModel(MODELS.linear.id);
    calculate();

    chooseModel(MODELS.squared.id);
    calculate();

    expect(announcedWinner()).toBe("Stay");
  });

  it("shows no result when the model changes before calculating", () => {
    fillModelSensitiveDecision();
    chooseModel(MODELS.cubed.id);

    expect(resultText()).toBe("");
  });

  it("explains the selected model", () => {
    for (const model of Object.values(MODELS)) {
      chooseModel(model.id);

      expect(hintText()).toBe(MODEL_HINTS[model.id]);
    }
  });

  it("returns to the default model and clears the result on reset", () => {
    fillModelSensitiveDecision();
    chooseModel(MODELS.linear.id);
    calculate();

    globalThis.resetSliders();

    expect(modelSelect().value).toBe(MODELS.squared.id);
    expect(hintText()).toBe(MODEL_HINTS[MODELS.squared.id]);
    expect(resultText()).toBe("");
  });
});
