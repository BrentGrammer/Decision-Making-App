import {
    DEFAULT_MODEL_ID,
    MODELS,
    resolveModel,
} from "./scoring.js";
import {
    CONCERN_HINT,
    DEALBREAKER_CONCERN_HINT,
    MODEL_HINTS,
    MODEL_LABELS,
} from "./constants/strings.js";

function modelSelect() {
    return document.getElementById("model");
}

export function selectedModel() {
    return modelSelect().value;
}

function updateModelHints() {
    document.getElementById("model-hint").textContent =
        MODEL_HINTS[selectedModel()];
    document.getElementById("concern-hint").textContent = resolveModel(
        selectedModel(),
    ).veto
        ? DEALBREAKER_CONCERN_HINT
        : CONCERN_HINT;
}

function syncCustomDropdown(id) {
    const triggerText = document.getElementById("model-trigger-text");
    if (triggerText && MODEL_LABELS[id]) {
        triggerText.textContent = MODEL_LABELS[id];
    }
    const menu = document.getElementById("model-menu");
    if (menu) {
        for (const item of menu.querySelectorAll("[role='option']")) {
            const isSelected = item.dataset.value === id;
            item.setAttribute("aria-selected", String(isSelected));
            item.classList.toggle("selected", isSelected);
        }
    }
}

export function setSelectedModel(id) {
    modelSelect().value = id;
    syncCustomDropdown(id);
    updateModelHints();
}

export function resetModel() {
    setSelectedModel(DEFAULT_MODEL_ID);
}

function setupCustomDropdown() {
    const trigger = document.getElementById("model-trigger");
    const menu = document.getElementById("model-menu");
    const select = modelSelect();
    if (!trigger || !menu) return;

    menu.replaceChildren();
    for (const model of Object.values(MODELS)) {
        const li = document.createElement("li");
        li.role = "option";
        li.className = "custom-dropdown-option";
        li.dataset.value = model.id;
        li.textContent = MODEL_LABELS[model.id];
        li.addEventListener("click", () => {
            setSelectedModel(model.id);
            select.dispatchEvent(new Event("change", { bubbles: true }));
            closeDropdown();
            trigger.focus();
        });
        menu.appendChild(li);
    }

    function openDropdown() {
        menu.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
    }

    function closeDropdown() {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
    }

    trigger.addEventListener("click", () => {
        if (menu.hidden) {
            openDropdown();
        } else {
            closeDropdown();
        }
    });

    document.addEventListener("click", (event) => {
        if (!event.target.closest("#model-dropdown")) {
            closeDropdown();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !menu.hidden) {
            closeDropdown();
            trigger.focus();
        }
    });
}

export function initModelControls() {
    const select = modelSelect();
    select.replaceChildren();
    for (const model of Object.values(MODELS)) {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = MODEL_LABELS[model.id];
        select.append(option);
    }
    setupCustomDropdown();
    resetModel();
    select.addEventListener("change", () => {
        syncCustomDropdown(select.value);
        updateModelHints();
    });
}
