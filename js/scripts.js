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
import { CLASS_NAMES, ELEMENT_IDS, SELECTORS } from "./constants/selectors.js";
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
    for (const field of document.getElementsByClassName(
        CLASS_NAMES.sliderStatus,
    )) {
        field.value = "0";
    }
    const inputA = document.getElementById(ELEMENT_IDS.decisionA);
    const inputB = document.getElementById(ELEMENT_IDS.decisionB);
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
    const result = document.getElementById(ELEMENT_IDS.finalResult);
    showResult(
        formatComparison(
            compareDecisions({
                decisionA: document.getElementById(ELEMENT_IDS.decisionA).value,
                decisionB: document.getElementById(ELEMENT_IDS.decisionB).value,
                ...considerations,
                model: selectedModel(),
            }),
        ),
    );
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function onFormInput(event) {
    if (event.target.classList.contains(CLASS_NAMES.sliders)) {
        sliderChange(event.target);
        validateConsiderationRow(event.target);
        return;
    }
    if (event.target.classList.contains(CLASS_NAMES.sliderStatus)) {
        validateConsiderationRow(ratingChange(event.target));
        return;
    }
    if (
        event.target.matches(SELECTORS.textInput) &&
        event.target.closest(SELECTORS.considerationText)
    ) {
        const slider = event.target
            .closest(SELECTORS.considerationRow)
            .querySelector(SELECTORS.sliders);
        validateConsiderationRow(slider);
        pruneDuplicateWarnings(
            event.target.closest(SELECTORS.list)?.dataset.group,
        );
    }
}

function onFormClick(event) {
    const add = event.target.closest(SELECTORS.addRow);
    if (add) {
        addConsiderationRow(add.dataset.group);
        return;
    }
    const remove = event.target.closest(SELECTORS.removeRow);
    if (remove) {
        const groupId = remove.closest(SELECTORS.list)?.dataset.group;
        removeConsiderationRow(remove);
        pruneDuplicateWarnings(groupId);
    }
}

function initApp({ duplicateConsiderationsDetector, decisionsStore } = {}) {
    window.sliderChange = sliderChange;
    window.resetSliders = resetSliders;
    window.calculate = calculate;

    const form = document.querySelector(SELECTORS.form);
    form.addEventListener("input", onFormInput);
    form.addEventListener("click", onFormClick);
    document
        .getElementById(ELEMENT_IDS.calculateDecisions)
        .addEventListener("click", calculate);
    document
        .getElementById(ELEMENT_IDS.resetDecisions)
        .addEventListener("click", resetSliders);

    restoreDefaultRows();
    initModelControls();
    initSavedDecisions({
        setSelectedModel,
        decisionsStore,
        resetApp: resetSliders,
    });

    initDecisionValidation();
    initDuplicateConsiderationsDetector({
        duplicateConsiderationsDetector:
            duplicateConsiderationsDetector ??
            createDuplicateConsiderationsDetector(),
    });
}

export { sliderChange, resetSliders, calculate, initApp };
