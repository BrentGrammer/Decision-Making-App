import {
    compareDecisions,
    isValidDecisionName,
} from "./scoring.js";
import {
    BLANK_CON_ERROR,
    BLANK_PRO_ERROR,
    CON_PLACEHOLDER,
    DECISION_NAME_FIELD_ERROR,
    formatComparison,
    PRO_PLACEHOLDER,
    REMOVE_CON_LABEL,
    REMOVE_PRO_LABEL,
} from "./constants/strings.js";

const CONSIDERATION_KIND = Object.freeze({
    pro: "pro",
    con: "con",
});

const LISTS = Object.freeze({
    prosA: Object.freeze({ id: "prosA", kind: CONSIDERATION_KIND.pro }),
    consA: Object.freeze({ id: "consA", kind: CONSIDERATION_KIND.con }),
    prosB: Object.freeze({ id: "prosB", kind: CONSIDERATION_KIND.pro }),
    consB: Object.freeze({ id: "consB", kind: CONSIDERATION_KIND.con }),
});

const CONSIDERATION_UI = {
    [CONSIDERATION_KIND.pro]: {
        placeholder: PRO_PLACEHOLDER,
        removeLabel: REMOVE_PRO_LABEL,
        blankError: BLANK_PRO_ERROR,
    },
    [CONSIDERATION_KIND.con]: {
        placeholder: CON_PLACEHOLDER,
        removeLabel: REMOVE_CON_LABEL,
        blankError: BLANK_CON_ERROR,
    },
};

let considerationSeq = 0;

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

function considerationTextInput(slider) {
    const textCell = slider.parentElement?.previousElementSibling;
    return textCell?.querySelector("input[type='text']") ?? null;
}

function considerationErrorElement(slider) {
    const textCell = slider.parentElement?.previousElementSibling;
    return textCell?.querySelector(".field-error") ?? null;
}

function considerationText(slider) {
    const input = considerationTextInput(slider);
    return input ? input.value.trim() : "";
}

function listOfSlider(slider) {
    return Object.values(LISTS).find((list) => slider.classList.contains(list.id));
}

function uiForList(list) {
    return CONSIDERATION_UI[list.kind];
}

function blankConsiderationMessage(slider) {
    const list = listOfSlider(slider);
    return list ? uiForList(list).blankError : "";
}

function setConsiderationValidity(slider, message) {
    const input = considerationTextInput(slider);
    const error = considerationErrorElement(slider);
    if (!input) {
        return;
    }
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

function validateConsiderationRow(slider) {
    const hasUncountedWeight =
        parseInt(slider.value, 10) !== 0 && !considerationText(slider);
    setConsiderationValidity(
        slider,
        hasUncountedWeight ? blankConsiderationMessage(slider) : "",
    );
}

function validateConsiderationRows() {
    for (const slider of document.getElementsByClassName("sliders")) {
        validateConsiderationRow(slider);
    }
}

function addConsiderationRow(group, { focus = true } = {}) {
    const list = LISTS[group];
    const ui = uiForList(list);
    const template = document.getElementById("consideration-row");
    const row = template.content.firstElementChild.cloneNode(true);
    const textInput = row.querySelector("input[type='text']");
    const slider = row.querySelector(".sliders");
    const remove = row.querySelector(".remove-row");
    const error = row.querySelector(".field-error");

    textInput.placeholder = ui.placeholder;
    slider.classList.add(list.id);
    slider.dataset.kind = list.kind;
    remove.setAttribute("aria-label", ui.removeLabel);

    considerationSeq += 1;
    error.id = `consideration-${considerationSeq}-error`;
    textInput.setAttribute("aria-describedby", error.id);

    document
        .querySelector(`[data-group="${list.id}"] .consideration-rows`)
        .appendChild(row);

    if (focus) {
        textInput.focus();
    }
}

function restoreDefaultRows() {
    for (const list of Object.values(LISTS)) {
        const rows = document.querySelector(
            `[data-group="${list.id}"] .consideration-rows`,
        );
        rows.replaceChildren();
        addConsiderationRow(list.id, { focus: false });
    }
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
    validateConsiderationRows();
    const result = document.getElementById("finalResult");
    result.textContent = formatComparison(
        compareDecisions({
            decisionA: document.getElementById("A").value,
            decisionB: document.getElementById("B").value,
            prosA: considerationsFrom(document.getElementsByClassName(LISTS.prosA.id)),
            consA: considerationsFrom(document.getElementsByClassName(LISTS.consA.id)),
            prosB: considerationsFrom(document.getElementsByClassName(LISTS.prosB.id)),
            consB: considerationsFrom(document.getElementsByClassName(LISTS.consB.id)),
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
        remove.closest(".consideration-row").remove();
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
