import {
    LOAD_ERROR,
    LOAD_LABEL,
    LOAD_SUCCESS,
    REPLACE_CONFIRMATION,
    SAVE_LABEL,
} from "./constants/strings.js";
import { clearDecisionValidation } from "./decision-validation.js";
import { showResult } from "./result-view.js";
import {
    MAX_SAVED_DECISIONS_FILE_SIZE,
    parseSavedDecisions,
    serializeSavedDecisions,
} from "./saved-decisions.js";
import {
    getConsiderations,
    replaceConsiderationRows,
} from "./consideration-rows.js";
import {
    CONSIDERATION_GROUPS,
    CONSIDERATION_LISTS,
    DECISION_IDS,
} from "./constants/decision-table.js";
let hasUnsavedChanges = false;

function currentDecision(id) {
    const decision = { name: document.getElementById(id).value };
    for (const list of CONSIDERATION_LISTS) {
        const group = CONSIDERATION_GROUPS[`${list}${id}`];
        decision[list] = getConsiderations(group.id);
    }
    return decision;
}

function currentDecisions() {
    return {
        model: document.getElementById("model").value,
        decisions: DECISION_IDS.map(currentDecision),
    };
}

function saveDecisions() {
    const file = new Blob([serializeSavedDecisions(currentDecisions())], {
        type: "application/json",
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "saved-decisions.json";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    hasUnsavedChanges = false;
}

function showLoadError(message) {
    const error = document.getElementById("load-decisions-error");
    error.textContent = message;
    error.hidden = !message;
}

function showLoadStatus(message) {
    document.getElementById("load-decisions-status").textContent = message;
}

function restoreSavedDecisions({ model, decisions }, setSelectedModel) {
    for (const [index, id] of DECISION_IDS.entries()) {
        const decision = decisions[index];
        document.getElementById(id).value = decision.name;
        for (const list of CONSIDERATION_LISTS) {
            const group = CONSIDERATION_GROUPS[`${list}${id}`];
            replaceConsiderationRows(group.id, decision[list]);
        }
    }
    setSelectedModel(model);
    clearDecisionValidation();
    showResult([]);
    hasUnsavedChanges = false;
}

async function loadDecisions(event, setSelectedModel) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) {
        return;
    }
    showLoadStatus("");
    try {
        if (file.size > MAX_SAVED_DECISIONS_FILE_SIZE) {
            throw new Error("Saved decisions file is too large");
        }
        const saved = parseSavedDecisions(await file.text());
        showLoadError("");
        if (
            hasUnsavedChanges &&
            !window.confirm(REPLACE_CONFIRMATION)
        ) {
            return;
        }
        restoreSavedDecisions(saved, setSelectedModel);
        showLoadStatus(LOAD_SUCCESS);
    } catch {
        showLoadError(LOAD_ERROR);
    } finally {
        input.value = "";
    }
}

function trackChanges() {
    const form = document.querySelector("form");
    form.addEventListener("input", (event) => {
        if (event.target.id !== "load-decisions-file") {
            hasUnsavedChanges = true;
        }
    });
    form.addEventListener("click", (event) => {
        if (event.target.closest(".add-row, .remove-row")) {
            hasUnsavedChanges = true;
        }
    });
    document.getElementById("model").addEventListener("change", () => {
        hasUnsavedChanges = true;
    });
}

export function resetSavedDecisionsState() {
    showLoadStatus("");
    showLoadError("");
    hasUnsavedChanges = false;
}

export function initSavedDecisions({ setSelectedModel }) {
    resetSavedDecisionsState();
    trackChanges();

    const saveButton = document.getElementById("save-decisions");
    saveButton.textContent = SAVE_LABEL;
    saveButton.addEventListener("click", saveDecisions);

    const loadButton = document.getElementById("load-decisions");
    const loadInput = document.getElementById("load-decisions-file");
    loadButton.textContent = LOAD_LABEL;
    loadButton.addEventListener("click", () => loadInput.click());
    loadInput.addEventListener("change", (event) =>
        loadDecisions(event, setSelectedModel),
    );
}
