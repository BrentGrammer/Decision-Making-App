import {
    DELETE_SAVED_DECISION_LABEL,
    LOAD_ERROR,
    LOAD_LABEL,
    LOAD_SUCCESS,
    REPLACE_CONFIRMATION,
    SAVED_DECISIONS_CLOSE,
    SAVED_DECISIONS_DIALOG_TITLE,
    SAVED_DECISIONS_EMPTY,
    SAVE_ERROR,
    SAVE_LABEL,
    SAVE_SUCCESS,
    SIGN_IN_WITH_GOOGLE_LABEL,
    SIGN_OUT_LABEL,
} from "./constants/strings.js";
import { clearDecisionValidation } from "./decision-validation.js";
import { showResult } from "./result-view.js";
import {
    MAX_SAVED_DECISIONS_FILE_SIZE,
    createCloudDecisionsStore,
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
let currentUser = null;
let activeDecisionId = null;
let activeStore = null;

function savedDecisionsDialog() {
    return document.getElementById("saved-decisions-dialog");
}

function openSavedDecisionsDialog() {
    const dialog = savedDecisionsDialog();
    if (typeof dialog.showModal === "function") {
        dialog.showModal();
        return;
    }
    dialog.open = true;
}

function closeSavedDecisionsDialog() {
    const dialog = savedDecisionsDialog();
    if (typeof dialog.close === "function") {
        dialog.close();
        return;
    }
    dialog.open = false;
}

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

function downloadSavedDecisionsFile() {
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

async function saveDecisions() {
    if (!currentUser) {
        downloadSavedDecisionsFile();
        return;
    }
    showLoadStatus("");
    showLoadError("");
    try {
        const json = serializeSavedDecisions(currentDecisions());
        const savedRecord = await activeStore.save(json, activeDecisionId);
        activeDecisionId = savedRecord?.id ?? activeDecisionId;
        hasUnsavedChanges = false;
        showLoadStatus(SAVE_SUCCESS);
    } catch {
        showLoadError(SAVE_ERROR);
    }
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

async function loadDecisionsFromFile(event, setSelectedModel) {
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
        if (hasUnsavedChanges && !window.confirm(REPLACE_CONFIRMATION)) {
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

function updateEmptyDialogState() {
    const listElement = document.getElementById("saved-decisions-list");
    const emptyMessage = document.getElementById("saved-decisions-empty");
    emptyMessage.hidden = listElement.children.length > 0;
}

function createSavedDecisionItem(item, setSelectedModel) {
    const row = document.createElement("li");
    row.className = "saved-decision-item";

    const title = document.createElement("span");
    title.className = "saved-decision-title";
    title.textContent = item.title;

    const actions = document.createElement("div");
    actions.className = "saved-decision-actions";

    const loadButton = document.createElement("button");
    loadButton.type = "button";
    loadButton.className = "button";
    loadButton.textContent = LOAD_LABEL;
    loadButton.addEventListener("click", async () => {
        showLoadStatus("");
        showLoadError("");
        try {
            const saved = await activeStore.get(item.id);
            if (hasUnsavedChanges && !window.confirm(REPLACE_CONFIRMATION)) {
                return;
            }
            restoreSavedDecisions(saved, setSelectedModel);
            activeDecisionId = item.id;
            closeSavedDecisionsDialog();
            showLoadStatus(LOAD_SUCCESS);
        } catch {
            closeSavedDecisionsDialog();
            showLoadError(LOAD_ERROR);
        }
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button button-secondary";
    deleteButton.textContent = DELETE_SAVED_DECISION_LABEL;
    deleteButton.addEventListener("click", async () => {
        await activeStore.remove(item.id);
        if (activeDecisionId === item.id) {
            activeDecisionId = null;
        }
        row.remove();
        updateEmptyDialogState();
    });

    actions.append(loadButton, deleteButton);
    row.append(title, actions);
    return row;
}

async function openCloudLoadDialog(setSelectedModel) {
    showLoadStatus("");
    showLoadError("");
    try {
        const items = await activeStore.list();
        const listElement = document.getElementById("saved-decisions-list");
        listElement.replaceChildren(
            ...items.map((item) =>
                createSavedDecisionItem(item, setSelectedModel),
            ),
        );
        updateEmptyDialogState();
        openSavedDecisionsDialog();
    } catch {
        showLoadError(LOAD_ERROR);
    }
}

function renderAuthState(user) {
    currentUser = user;
    const signInLink = document.getElementById("sign-in-google");
    const signedInUser = document.getElementById("signed-in-user");
    const signOutButton = document.getElementById("sign-out");
    if (!signInLink || !signedInUser || !signOutButton) {
        return;
    }

    if (user) {
        signInLink.hidden = true;
        signedInUser.textContent = user.name || user.email;
        signedInUser.hidden = false;
        signOutButton.hidden = false;
        return;
    }

    signInLink.hidden = false;
    signedInUser.textContent = "";
    signedInUser.hidden = true;
    signOutButton.hidden = true;
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
    activeDecisionId = null;
}

export function initSavedDecisions({ setSelectedModel, decisionsStore } = {}) {
    activeStore = decisionsStore ?? createCloudDecisionsStore();
    resetSavedDecisionsState();
    trackChanges();
    renderAuthState(null);

    const signInLink = document.getElementById("sign-in-google");
    const signOutButton = document.getElementById("sign-out");
    if (signInLink) {
        signInLink.textContent = SIGN_IN_WITH_GOOGLE_LABEL;
    }
    if (signOutButton) {
        signOutButton.textContent = SIGN_OUT_LABEL;
        signOutButton.addEventListener("click", async () => {
            await activeStore.logout();
            activeDecisionId = null;
            renderAuthState(null);
        });
    }

    const dialog = savedDecisionsDialog();
    if (dialog) {
        dialog.querySelector(".dialog-title").textContent =
            SAVED_DECISIONS_DIALOG_TITLE;
        document.getElementById("saved-decisions-empty").textContent =
            SAVED_DECISIONS_EMPTY;
        const closeButton = dialog.querySelector(".dialog-close");
        closeButton.textContent = SAVED_DECISIONS_CLOSE;
        closeButton.addEventListener("click", closeSavedDecisionsDialog);
    }

    const saveButton = document.getElementById("save-decisions");
    saveButton.textContent = SAVE_LABEL;
    saveButton.addEventListener("click", saveDecisions);

    const loadButton = document.getElementById("load-decisions");
    const loadInput = document.getElementById("load-decisions-file");
    loadButton.textContent = LOAD_LABEL;
    loadButton.addEventListener("click", () => {
        if (currentUser) {
            openCloudLoadDialog(setSelectedModel);
            return;
        }
        loadInput.click();
    });
    loadInput.addEventListener("change", (event) =>
        loadDecisionsFromFile(event, setSelectedModel),
    );

    Promise.resolve(activeStore.getUser?.()).then((user) => {
        if (user) {
            renderAuthState(user);
        }
    });
}
