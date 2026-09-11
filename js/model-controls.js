import {
    DEFAULT_MODEL_ID,
    MODELS,
    resolveModel,
} from "./scoring.js";
import {
    CONCERN_HINT,
    DEALBREAKER_CONCERN_HINT,
    MODEL_HINTS,
    MODEL_LABELS,
} from "./constants/strings.js";

function modelSelect() {
    return document.getElementById("model");
}

export function selectedModel() {
    return modelSelect().value;
}

function updateModelHints() {
    document.getElementById("model-hint").textContent =
        MODEL_HINTS[selectedModel()];
    document.getElementById("concern-hint").textContent = resolveModel(
        selectedModel(),
    ).veto
        ? DEALBREAKER_CONCERN_HINT
        : CONCERN_HINT;
}

export function setSelectedModel(id) {
    modelSelect().value = id;
    updateModelHints();
}

export function resetModel() {
    setSelectedModel(DEFAULT_MODEL_ID);
}

export function initModelControls() {
    const select = modelSelect();
    select.replaceChildren();
    for (const model of Object.values(MODELS)) {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = MODEL_LABELS[model.id];
        select.append(option);
    }
    resetModel();
    select.addEventListener("change", updateModelHints);
}
