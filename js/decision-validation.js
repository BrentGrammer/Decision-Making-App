import {
    DECISION_NAME_MAX_LENGTH,
    hasRatedRows,
    isValidDecisionName,
    trimmedDecisionName,
} from "./scoring.js";
import {
    CONSIDERATION_ROW_VALIDATION_ERROR,
    DECISION_NAME_FIELD_ERROR,
    DECISION_NAME_LENGTH_VALIDATION_ERROR,
    DECISION_NAME_VALIDATION_ERROR,
    EMPTY_TABLE_VALIDATION_ERROR,
    VALIDATION_ERROR_DISMISS,
    VALIDATION_ERROR_TITLE,
} from "./constants/strings.js";
import { validateConsiderationRows } from "./consideration-rows.js";
import { DECISION_IDS } from "./constants/decision-table.js";

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
    for (const id of DECISION_IDS) {
        validateDecisionNameField(document.getElementById(id));
    }
}

function validationDialog() {
    return document.getElementById("validation-dialog");
}

function showValidationErrors(messages) {
    validationDialog()
        .querySelector(".validation-errors")
        .replaceChildren(
            ...messages.map((message) => {
                const paragraph = document.createElement("p");
                paragraph.className = "validation-error";
                paragraph.textContent = message;
                return paragraph;
            }),
        );
}

function decisionNameValidationErrors() {
    const names = DECISION_IDS.map(
        (id) => document.getElementById(id).value,
    );
    if (names.every((name) => isValidDecisionName(name))) {
        return [];
    }
    const hasLongName = names.some(
        (name) =>
            trimmedDecisionName(name).length > DECISION_NAME_MAX_LENGTH,
    );
    return [
        hasLongName
            ? DECISION_NAME_LENGTH_VALIDATION_ERROR
            : DECISION_NAME_VALIDATION_ERROR,
    ];
}

function decisionTableValidationErrors(considerations, uncountedRows) {
    const validationErrors = decisionNameValidationErrors();
    if (uncountedRows > 0) {
        validationErrors.push(CONSIDERATION_ROW_VALIDATION_ERROR);
    } else if (!hasRatedRows(considerations)) {
        validationErrors.push(EMPTY_TABLE_VALIDATION_ERROR);
    }
    return validationErrors;
}

function openValidationDialog() {
    const dialog = validationDialog();
    if (typeof dialog.showModal === "function") {
        dialog.showModal();
        return;
    }
    dialog.open = true;
}

function closeValidationDialog() {
    const dialog = validationDialog();
    if (typeof dialog.close === "function") {
        dialog.close();
        return;
    }
    dialog.open = false;
}

export function validateDecisionTable(considerations) {
    validateDecisionNames();
    const validationErrors = decisionTableValidationErrors(
        considerations,
        validateConsiderationRows(),
    );
    if (validationErrors.length > 0) {
        showValidationErrors(validationErrors);
        openValidationDialog();
        return false;
    }
    closeValidationDialog();
    return true;
}

export function clearDecisionValidation() {
    for (const id of DECISION_IDS) {
        setNameValidity(document.getElementById(id), "");
    }
    closeValidationDialog();
}

export function initDecisionValidation() {
    const dialog = validationDialog();
    dialog.querySelector(".dialog-title").textContent = VALIDATION_ERROR_TITLE;
    dialog.querySelector(".dialog-dismiss").textContent =
        VALIDATION_ERROR_DISMISS;
    dialog
        .querySelector(".dialog-dismiss")
        .addEventListener("click", closeValidationDialog);

    for (const id of DECISION_IDS) {
        const input = document.getElementById(id);
        input.addEventListener("blur", () => validateDecisionNameField(input));
        input.addEventListener("input", () => {
            if (input.getAttribute("aria-invalid") === "true") {
                validateDecisionNameField(input);
            }
        });
    }
}
