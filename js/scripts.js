import { compareDecisions } from "./scoring.js";
import { formatComparison } from "./constants/strings.js";
import {
    clearDecisionValidation,
    initDecisionValidation,
    validateDecisionTable,
} from "./decision-validation.js";
import { showResult } from "./result-view.js";
import {
    initSavedDecisions,
    resetSavedDecisionsState,
} from "./saved-decisions-ui.js";
import {
    addConsiderationRow,
    getConsiderations,
    ratingChange,
    removeConsiderationRow,
    restoreDefaultRows,
    sliderChange,
    validateConsiderationRow,
} from "./consideration-rows.js";
import { CONSIDERATION_GROUPS } from "./constants/decision-table.js";
import {
    initModelControls,
    resetModel,
    selectedModel,
    setSelectedModel,
} from "./model-controls.js";
import {
    clearDuplicateWarnings,
    initDuplicateConsiderationsDetector,
    pruneDuplicateWarnings,
} from "./duplicate-considerations-detector-ui.js";
import { createDuplicateConsiderationsDetector } from "./duplicate-considerations-detector.js";

function resetSliders() {
    restoreDefaultRows();
    for (const field of document.getElementsByClassName("sliderStatus")) {
        field.value = "0";
    }
    const inputA = document.getElementById("A");
    const inputB = document.getElementById("B");
    inputA.value = "";
    inputB.value = "";
    clearDecisionValidation();
    clearDuplicateWarnings();
    resetModel();
    showResult([]);
    resetSavedDecisionsState();
}

function calculate() {
    const considerations = {
        prosA: getConsiderations(CONSIDERATION_GROUPS.prosA.id),
        consA: getConsiderations(CONSIDERATION_GROUPS.consA.id),
        prosB: getConsiderations(CONSIDERATION_GROUPS.prosB.id),
        consB: getConsiderations(CONSIDERATION_GROUPS.consB.id),
    };
    if (!validateDecisionTable(considerations)) {
        showResult([]);
        return;
    }
    const result = document.getElementById("finalResult");
    showResult(
        formatComparison(
            compareDecisions({
                decisionA: document.getElementById("A").value,
                decisionB: document.getElementById("B").value,
                ...considerations,
                model: selectedModel(),
            }),
        ),
    );
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function onFormInput(event) {
    if (event.target.classList.contains("sliders")) {
        sliderChange(event.target);
        validateConsiderationRow(event.target);
        return;
    }
    if (event.target.classList.contains("sliderStatus")) {
        validateConsiderationRow(ratingChange(event.target));
        return;
    }
    if (
        event.target.matches("input[type='text']") &&
        event.target.closest(".consideration-text")
    ) {
        const slider = event.target
            .closest(".consideration-row")
            .querySelector(".sliders");
        validateConsiderationRow(slider);
        pruneDuplicateWarnings(event.target.closest(".list")?.dataset.group);
    }
}

function onFormClick(event) {
    const add = event.target.closest(".add-row");
    if (add) {
        addConsiderationRow(add.dataset.group);
        return;
    }
    const remove = event.target.closest(".remove-row");
    if (remove) {
        const groupId = remove.closest(".list")?.dataset.group;
        removeConsiderationRow(remove);
        pruneDuplicateWarnings(groupId);
    }
}

function initApp({ duplicateConsiderationsDetector, decisionsStore } = {}) {
    window.sliderChange = sliderChange;
    window.resetSliders = resetSliders;
    window.calculate = calculate;

    const form = document.querySelector("form");
    form.addEventListener("input", onFormInput);
    form.addEventListener("click", onFormClick);

    restoreDefaultRows();
    initModelControls();
    initSavedDecisions({ setSelectedModel, decisionsStore });

    initDecisionValidation();
    initDuplicateConsiderationsDetector({
        duplicateConsiderationsDetector:
            duplicateConsiderationsDetector ??
            createDuplicateConsiderationsDetector(),
    });
}

export { sliderChange, resetSliders, calculate, initApp };
