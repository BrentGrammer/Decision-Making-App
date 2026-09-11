import {
    BLANK_CON_ERROR,
    BLANK_PRO_ERROR,
    CON_PLACEHOLDER,
    PRO_PLACEHOLDER,
    REMOVE_CON_LABEL,
    REMOVE_PRO_LABEL,
} from "./constants/strings.js";

export const CONSIDERATION_KIND = Object.freeze({
    pro: "pro",
    con: "con",
});

export const CONSIDERATION_GROUPS = Object.freeze({
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

const MIN_RATING = 0;
const MAX_RATING = 10;

function ratingField(slider) {
    return slider.parentElement.querySelector(".sliderStatus");
}

export function sliderChange(slider) {
    const field = ratingField(slider);
    if (field) {
        field.value = slider.value;
    }
}

function clampRating(value) {
    const rating = parseInt(value, 10);
    if (Number.isNaN(rating)) {
        return MIN_RATING;
    }
    return Math.min(MAX_RATING, Math.max(MIN_RATING, rating));
}

export function ratingChange(field) {
    const slider = field.closest(".slider-well").querySelector(".sliders");
    const rating = clampRating(field.value);
    slider.value = String(rating);
    if (field.value !== "") {
        field.value = String(rating);
    }
    return slider;
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

function groupOfSlider(slider) {
    return Object.values(CONSIDERATION_GROUPS).find((group) =>
        slider.classList.contains(group.id),
    );
}

function blankConsiderationMessage(slider) {
    const group = groupOfSlider(slider);
    return group ? CONSIDERATION_UI[group.kind].blankError : "";
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

export function validateConsiderationRow(slider) {
    const hasUncountedWeight =
        parseInt(slider.value, 10) !== 0 && !considerationText(slider);
    setConsiderationValidity(
        slider,
        hasUncountedWeight ? blankConsiderationMessage(slider) : "",
    );
    return hasUncountedWeight;
}

export function validateConsiderationRows() {
    let uncounted = 0;
    for (const slider of document.getElementsByClassName("sliders")) {
        if (validateConsiderationRow(slider)) {
            uncounted += 1;
        }
    }
    return uncounted;
}

export function addConsiderationRow(group, { focus = true } = {}) {
    const groupDef = CONSIDERATION_GROUPS[group];
    const ui = CONSIDERATION_UI[groupDef.kind];
    const template = document.getElementById("consideration-row");
    const row = template.content.firstElementChild.cloneNode(true);
    const textInput = row.querySelector("input[type='text']");
    const slider = row.querySelector(".sliders");
    const remove = row.querySelector(".remove-row");
    const error = row.querySelector(".field-error");

    textInput.placeholder = ui.placeholder;
    slider.classList.add(groupDef.id);
    slider.dataset.kind = groupDef.kind;
    remove.setAttribute("aria-label", ui.removeLabel);

    considerationSeq += 1;
    error.id = `consideration-${considerationSeq}-error`;
    textInput.setAttribute("aria-describedby", error.id);

    document
        .querySelector(`[data-group="${groupDef.id}"] .consideration-rows`)
        .appendChild(row);

    syncRemoveButtons(groupDef.id);

    if (focus) {
        textInput.focus();
    }
}

function listRows(groupId) {
    return document.querySelectorAll(
        `[data-group="${groupId}"] .consideration-row`,
    );
}

function syncRemoveButtons(groupId) {
    const rows = listRows(groupId);
    const hide = rows.length <= 1;
    for (const row of rows) {
        row.querySelector(".remove-row").hidden = hide;
    }
}

export function removeConsiderationRow(removeButton) {
    const list = removeButton.closest(".list");
    const groupId = list.dataset.group;
    if (listRows(groupId).length <= 1) {
        return;
    }
    removeButton.closest(".consideration-row").remove();
    syncRemoveButtons(groupId);
}

export function restoreDefaultRows() {
    for (const group of Object.values(CONSIDERATION_GROUPS)) {
        const rows = document.querySelector(
            `[data-group="${group.id}"] .consideration-rows`,
        );
        rows.replaceChildren();
        addConsiderationRow(group.id, { focus: false });
    }
}

export function getConsiderations(groupId) {
    const sliders = document.getElementsByClassName(groupId);
    const considerations = [];
    for (const slider of sliders) {
        considerations.push({
            text: considerationText(slider),
            weight: slider.value,
        });
    }
    return considerations;
}
