import {
    compareDecisions,
    isValidDecisionName,
} from "./scoring.js";
import {
    DECISION_NAME_FIELD_ERROR,
    formatComparison,
} from "./constants/strings.js";
import {
    addConsiderationRow,
    CONSIDERATION_GROUPS,
    getConsiderations,
    removeConsiderationRow,
    restoreDefaultRows,
    sliderChange,
    validateConsiderationRow,
    validateConsiderationRows,
} from "./consideration-rows.js";

function decisionNameMessage(value) {
    return isValidDecisionName(value) ? "" : DECISION_NAME_FIELD_ERROR;
}

function setNameValidity(input, message) {
    const error = document.getElementById(`${input.id}-error`);
    if (message) {
        input.setAttribute("aria-invalid", "true");
        if (error) {
            error.textContent = message;
            error.hidden = false;
        }
        return;
    }

    input.removeAttribute("aria-invalid");
    if (error) {
        error.textContent = "";
        error.hidden = true;
    }
}

function validateDecisionNameField(input) {
    setNameValidity(input, decisionNameMessage(input.value));
}

function validateDecisionNames() {
    const inputA = document.getElementById("A");
    const inputB = document.getElementById("B");
    validateDecisionNameField(inputA);
    validateDecisionNameField(inputB);
}

function resetSliders() {
    restoreDefaultRows();
    for (const label of document.getElementsByClassName("sliderStatus")) {
        label.textContent = "0";
    }
    const inputA = document.getElementById("A");
    const inputB = document.getElementById("B");
    inputA.value = "";
    inputB.value = "";
    setNameValidity(inputA, "");
    setNameValidity(inputB, "");
    document.getElementById("finalResult").textContent = "";
}

function calculate() {
    validateDecisionNames();
    validateConsiderationRows();
    const result = document.getElementById("finalResult");
    result.textContent = formatComparison(
        compareDecisions({
            decisionA: document.getElementById("A").value,
            decisionB: document.getElementById("B").value,
            prosA: getConsiderations(CONSIDERATION_GROUPS.prosA.id),
            consA: getConsiderations(CONSIDERATION_GROUPS.consA.id),
            prosB: getConsiderations(CONSIDERATION_GROUPS.prosB.id),
            consB: getConsiderations(CONSIDERATION_GROUPS.consB.id),
        }),
    );
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function onFormInput(event) {
    if (event.target.classList.contains("sliders")) {
        sliderChange(event.target);
        validateConsiderationRow(event.target);
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
        removeConsiderationRow(remove);
    }
}

function initApp() {
    window.sliderChange = sliderChange;
    window.resetSliders = resetSliders;
    window.calculate = calculate;

    const form = document.querySelector("form");
    form.addEventListener("input", onFormInput);
    form.addEventListener("click", onFormClick);

    restoreDefaultRows();

    for (const input of [document.getElementById("A"), document.getElementById("B")]) {
        input.addEventListener("blur", function () {
            validateDecisionNameField(this);
        });
        input.addEventListener("input", function () {
            if (this.getAttribute("aria-invalid") === "true") {
                validateDecisionNameField(this);
            }
        });
    }
}

export { sliderChange, resetSliders, calculate, initApp };
