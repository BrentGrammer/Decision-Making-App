import {
    CONSIDERATION_GROUPS,
    DUPLICATE_WARNING_CLASS,
} from "./constants/decision-table.js";
import {
    DETECT_DUPLICATES_LABEL,
    DUPLICATE_NEEDS_PAIR_VALIDATION_ERROR,
    DUPLICATE_PRIVACY_CANCEL,
    DUPLICATE_PRIVACY_CONTINUE,
    DUPLICATE_PRIVACY_MESSAGE,
    DUPLICATE_PRIVACY_TITLE,
    DUPLICATE_VALIDATION_ERROR_TITLE,
    DUPLICATE_WARNING_DISMISS,
    DUPLICATE_WARNING_REMOVE,
    duplicateWarningText,
} from "./constants/strings.js";
import {
    getConsiderations,
    removeDuplicateConsiderations,
} from "./consideration-rows.js";
import { showValidationDialog } from "./decision-validation.js";
import { withButtonLoading } from "./loading-spinner.js";

const noopDetector = async () => [];

let detectDuplicates = noopDetector;
let privacyConfirmed = false;
let scanGeneration = 0;

function privacyDialog() {
    return document.getElementById("duplicate-privacy-dialog");
}

function openPrivacyDialog() {
    const dialog = privacyDialog();
    if (typeof dialog.showModal === "function") {
        dialog.showModal();
        return;
    }
    dialog.open = true;
}

function closePrivacyDialog() {
    const dialog = privacyDialog();
    if (typeof dialog.close === "function") {
        dialog.close();
        return;
    }
    dialog.open = false;
}

function nonBlankConsiderations(groupId) {
    return getConsiderations(groupId)
        .map(({ text }) => text.trim())
        .filter(Boolean);
}

function warningContainer(groupId) {
    return document.querySelector(
        `[data-group="${groupId}"] .duplicate-warnings`,
    );
}

function createWarningElement(groupId, considerations) {
    const warning = document.createElement("div");
    warning.className = DUPLICATE_WARNING_CLASS;
    warning.dataset.considerations = JSON.stringify(considerations);

    const text = document.createElement("span");
    text.className = "duplicate-warning-text";
    text.textContent = duplicateWarningText(considerations);

    const actions = document.createElement("div");
    actions.className = "duplicate-warning-actions";

    const removeDuplicates = document.createElement("button");
    removeDuplicates.type = "button";
    removeDuplicates.className = "duplicate-warning-action";
    removeDuplicates.textContent = DUPLICATE_WARNING_REMOVE;
    removeDuplicates.addEventListener("click", () => {
        removeDuplicateConsiderations(groupId, considerations);
        warning.remove();
        pruneDuplicateWarnings(groupId);
    });

    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "duplicate-warning-dismiss";
    dismiss.textContent = DUPLICATE_WARNING_DISMISS;
    dismiss.addEventListener("click", () => {
        warning.remove();
    });

    actions.append(removeDuplicates, dismiss);
    warning.append(text, actions);
    return warning;
}

function renderGroupWarnings(groupId, duplicateGroups) {
    const container = warningContainer(groupId);
    if (!container) {
        return;
    }
    const elements = duplicateGroups
        .filter((group) => group.length >= 2)
        .map((group) => createWarningElement(groupId, group));
    container.replaceChildren(...elements);
}

async function scanGroup(groupId, generation) {
    const considerations = nonBlankConsiderations(groupId);
    if (considerations.length < 2) {
        renderGroupWarnings(groupId, []);
        return;
    }

    let indexGroups;
    try {
        indexGroups = await detectDuplicates(considerations);
    } catch {
        if (generation === scanGeneration) {
            renderGroupWarnings(groupId, []);
        }
        return;
    }

    if (generation !== scanGeneration) {
        return;
    }

    const textGroups = indexGroups.map((indexes) =>
        indexes.map((index) => considerations[index]).filter(Boolean),
    );
    renderGroupWarnings(groupId, textGroups);
}

async function scanAllGroups() {
    scanGeneration += 1;
    const generation = scanGeneration;
    const trigger = document.getElementById("detect-duplicates");
    await withButtonLoading(trigger, () =>
        Promise.all(
            Object.values(CONSIDERATION_GROUPS).map((group) =>
                scanGroup(group.id, generation),
            ),
        ),
    );
}

function hasComparableConsiderations() {
    return Object.values(CONSIDERATION_GROUPS).some(
        (group) => nonBlankConsiderations(group.id).length >= 2,
    );
}

function onDetectDuplicatesClick() {
    if (!hasComparableConsiderations()) {
        showValidationDialog([DUPLICATE_NEEDS_PAIR_VALIDATION_ERROR], {
            title: DUPLICATE_VALIDATION_ERROR_TITLE,
        });
        return;
    }
    if (privacyConfirmed) {
        scanAllGroups();
        return;
    }
    openPrivacyDialog();
}

function onPrivacyContinue() {
    privacyConfirmed = true;
    closePrivacyDialog();
    scanAllGroups();
}

function countByText(considerations) {
    const counts = new Map();
    for (const text of considerations) {
        counts.set(text, (counts.get(text) ?? 0) + 1);
    }
    return counts;
}

function allStillPresent(expected, availableCounts) {
    const needed = countByText(expected);
    for (const [text, count] of needed) {
        if ((availableCounts.get(text) ?? 0) < count) {
            return false;
        }
    }
    return true;
}

export function pruneDuplicateWarnings(groupId) {
    if (!groupId) {
        return;
    }
    const container = warningContainer(groupId);
    if (!container) {
        return;
    }
    const availableCounts = countByText(nonBlankConsiderations(groupId));
    for (const warning of [...container.children]) {
        const considerations = JSON.parse(
            warning.dataset.considerations || "[]",
        );
        if (!allStillPresent(considerations, availableCounts)) {
            warning.remove();
        }
    }
}

export function clearDuplicateWarnings() {
    scanGeneration += 1;
    for (const group of Object.values(CONSIDERATION_GROUPS)) {
        warningContainer(group.id)?.replaceChildren();
    }
}

export function initDuplicateConsiderationsDetector({
    duplicateConsiderationsDetector,
} = {}) {
    detectDuplicates = duplicateConsiderationsDetector ?? noopDetector;
    privacyConfirmed = false;
    clearDuplicateWarnings();

    const trigger = document.getElementById("detect-duplicates");
    trigger.textContent = DETECT_DUPLICATES_LABEL;
    trigger.addEventListener("click", onDetectDuplicatesClick);

    const dialog = privacyDialog();
    dialog.querySelector(".dialog-title").textContent = DUPLICATE_PRIVACY_TITLE;
    dialog.querySelector(".dialog-message").textContent =
        DUPLICATE_PRIVACY_MESSAGE;

    const continueButton = dialog.querySelector(".dialog-continue");
    continueButton.textContent = DUPLICATE_PRIVACY_CONTINUE;
    continueButton.addEventListener("click", onPrivacyContinue);

    const cancelButton = dialog.querySelector(".dialog-cancel");
    cancelButton.textContent = DUPLICATE_PRIVACY_CANCEL;
    cancelButton.addEventListener("click", closePrivacyDialog);
}
