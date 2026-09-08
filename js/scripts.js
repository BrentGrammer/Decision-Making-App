import {
    compareDecisions,
    isValidDecisionName,
} from "./scoring.js";
import { DECISION_NAME_FIELD_ERROR, formatComparison } from "./constants/strings.js";

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

function sliderChange(slider) {
    const label = slider.parentElement.querySelector(".sliderStatus");
    if (label) {
        label.textContent = slider.value;
    }
}

function resetSliders() {
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

function considerationText(slider) {
    const textCell = slider.parentElement?.previousElementSibling;
    if (!textCell) {
        return "";
    }
    const input = textCell.querySelector("input[type='text']");
    return input ? input.value.trim() : "";
}

function considerationsFrom(sliders) {
    const considerations = [];
    for (const slider of sliders) {
        considerations.push({
            text: considerationText(slider),
            weight: slider.value,
        });
    }
    return considerations;
}

function calculate() {
    validateDecisionNames();
    const result = document.getElementById("finalResult");
    result.textContent = formatComparison(
        compareDecisions({
            decisionA: document.getElementById("A").value,
            decisionB: document.getElementById("B").value,
            prosA: considerationsFrom(document.getElementsByClassName("prosA")),
            consA: considerationsFrom(document.getElementsByClassName("consA")),
            prosB: considerationsFrom(document.getElementsByClassName("prosB")),
            consB: considerationsFrom(document.getElementsByClassName("consB")),
        }),
    );
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function initApp() {
    window.sliderChange = sliderChange;
    window.resetSliders = resetSliders;
    window.calculate = calculate;

    for (const slider of document.getElementsByClassName("sliders")) {
        slider.addEventListener("input", function () {
            sliderChange(this);
        });
    }

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
