import {
    compareDecisions,
    DECISION_NAME_MAX_LENGTH,
    DEFAULT_MODEL_ID,
    hasRatedRows,
    isValidDecisionName,
    MODELS,
    resolveModel,
    trimmedDecisionName,
} from "./scoring.js";
import {
    CONSIDERATION_TYPE_LABELS,
    CONTRIBUTOR_COLUMN_LABELS,
    CONTRIBUTORS_CAPTION,
    CONTRIBUTORS_HINT,
    CONTRIBUTORS_HINT_LABEL,
    DECISION_NAME_FIELD_ERROR,
    formatComparison,
    RESULT_BLOCK,
    sharePercent,
    CONCERN_HINT,
    DEALBREAKER_CONCERN_HINT,
    VALIDATION_ERROR_DISMISS,
    EMPTY_TABLE_VALIDATION_ERROR,
    DECISION_NAME_LENGTH_VALIDATION_ERROR,
    DECISION_NAME_VALIDATION_ERROR,
    VALIDATION_ERROR_TITLE,
    CONSIDERATION_ROW_VALIDATION_ERROR,
    MODEL_HINTS,
    MODEL_LABELS,
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

function modelSelect() {
    return document.getElementById("model");
}

function selectedModel() {
    return modelSelect().value;
}

function showModelHint() {
    document.getElementById("model-hint").textContent =
        MODEL_HINTS[selectedModel()];
    document.getElementById("concern-hint").textContent = resolveModel(
        selectedModel(),
    ).veto
        ? DEALBREAKER_CONCERN_HINT
        : CONCERN_HINT;
}

function fillModelOptions() {
    const select = modelSelect();
    select.replaceChildren();
    for (const model of Object.values(MODELS)) {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = MODEL_LABELS[model.id];
        select.append(option);
    }
    select.value = DEFAULT_MODEL_ID;
    showModelHint();
}

const CONTRIBUTOR_COLUMNS = ["option", "type", "text", "rating", "share"];

function contributorCellText(row, column) {
    if (column === "type") {
        return CONSIDERATION_TYPE_LABELS[row.type];
    }
    if (column === "share") {
        return sharePercent(row.share);
    }
    return row[column];
}

function contributorCell(row, column) {
    const cell = document.createElement("td");
    cell.className = `contributor-${column}`;
    cell.textContent = contributorCellText(row, column);
    if (column === "type") {
        cell.dataset.type = row.type;
    }
    return cell;
}

function contributorRow(row) {
    const tableRow = document.createElement("tr");
    tableRow.className = "contributor-row";
    tableRow.append(
        ...CONTRIBUTOR_COLUMNS.map((column) => contributorCell(row, column)),
    );
    return tableRow;
}

function contributorHeading(heading) {
    const tableRow = document.createElement("tr");
    tableRow.className = "contributor-heading";
    const cell = document.createElement("th");
    cell.colSpan = CONTRIBUTOR_COLUMNS.length;
    cell.scope = "rowgroup";
    cell.textContent = heading;
    tableRow.append(cell);
    return tableRow;
}

function contributorGroup({ heading, rows }) {
    const body = document.createElement("tbody");
    body.className = "contributor-group";
    body.append(contributorHeading(heading), ...rows.map(contributorRow));
    return body;
}

function contributorColumnHeaders() {
    const head = document.createElement("thead");
    head.className = "contributor-columns";
    const tableRow = document.createElement("tr");
    tableRow.append(
        ...CONTRIBUTOR_COLUMNS.map((column) => {
            const cell = document.createElement("th");
            cell.scope = "col";
            cell.textContent = CONTRIBUTOR_COLUMN_LABELS[column];
            return cell;
        }),
    );
    head.append(tableRow);
    return head;
}

function contributorsHint() {
    const hint = document.createElement("button");
    hint.type = "button";
    hint.className = "hint";
    hint.setAttribute("aria-label", CONTRIBUTORS_HINT_LABEL);

    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#icon-info");
    icon.append(use);

    const text = document.createElement("span");
    text.className = "hint-text";
    text.textContent = CONTRIBUTORS_HINT;

    hint.append(icon, text);
    return hint;
}

function contributorsCaption() {
    const caption = document.createElement("caption");
    caption.className = "contributors-caption";
    caption.append(CONTRIBUTORS_CAPTION, contributorsHint());
    return caption;
}

function contributorsTable({ groups }) {
    const table = document.createElement("table");
    table.className = "contributors";
    table.append(
        contributorsCaption(),
        contributorColumnHeaders(),
        ...groups.map(contributorGroup),
    );
    return table;
}

function resultLine({ text }) {
    const paragraph = document.createElement("p");
    paragraph.className = "result-line";
    paragraph.textContent = text;
    return paragraph;
}

function resultBlock(block) {
    return block.kind === RESULT_BLOCK.contributors
        ? contributorsTable(block)
        : resultLine(block);
}

function showResult(blocks) {
    document
        .getElementById("finalResult")
        .replaceChildren(...blocks.map(resultBlock));
}

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
    modelSelect().value = DEFAULT_MODEL_ID;
    showModelHint();
    showResult([]);
}

function validationDialog() {
    return document.getElementById("validation-dialog");
}

function fillValidationDialog() {
    const dialog = validationDialog();
    dialog.querySelector(".dialog-title").textContent = VALIDATION_ERROR_TITLE;
    dialog.querySelector(".dialog-dismiss").textContent = VALIDATION_ERROR_DISMISS;
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
    const names = [
        document.getElementById("A").value,
        document.getElementById("B").value,
    ];
    const validationErrors = [];
    if (!names.every((name) => isValidDecisionName(name))) {
        validationErrors.push(
            names.some(
                (name) =>
                    trimmedDecisionName(name).length > DECISION_NAME_MAX_LENGTH,
            )
                ? DECISION_NAME_LENGTH_VALIDATION_ERROR
                : DECISION_NAME_VALIDATION_ERROR,
        );
    }
    return validationErrors;
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

function calculate() {
    validateDecisionNames();
    const uncountedRows = validateConsiderationRows();
    const considerations = {
        prosA: getConsiderations(CONSIDERATION_GROUPS.prosA.id),
        consA: getConsiderations(CONSIDERATION_GROUPS.consA.id),
        prosB: getConsiderations(CONSIDERATION_GROUPS.prosB.id),
        consB: getConsiderations(CONSIDERATION_GROUPS.consB.id),
    };
    const validationErrors = decisionTableValidationErrors(
        considerations,
        uncountedRows,
    );
    if (validationErrors.length > 0) {
        showResult([]);
        showValidationErrors(validationErrors);
        openValidationDialog();
        return;
    }
    closeValidationDialog();
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
    fillModelOptions();
    modelSelect().addEventListener("change", showModelHint);

    fillValidationDialog();
    validationDialog()
        .querySelector(".dialog-dismiss")
        .addEventListener("click", closeValidationDialog);

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
