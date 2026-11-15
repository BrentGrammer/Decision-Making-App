const LOADING_CLASS = "is-loading";
const SPINNER_CLASS = "loading-spinner";

function createSpinnerElement() {
    const spinner = document.createElement("span");
    spinner.className = SPINNER_CLASS;
    spinner.setAttribute("aria-hidden", "true");
    return spinner;
}

export async function withButtonLoading(button, task, { alsoDisable = [] } = {}) {
    if (!button || button.disabled) {
        return undefined;
    }

    const controls = [button, ...alsoDisable].filter(Boolean);
    for (const control of controls) {
        control.disabled = true;
    }

    button.setAttribute("aria-busy", "true");
    button.classList.add(LOADING_CLASS);
    const spinner = createSpinnerElement();
    button.prepend(spinner);

    try {
        return await task();
    } finally {
        spinner.remove();
        button.classList.remove(LOADING_CLASS);
        button.removeAttribute("aria-busy");
        for (const control of controls) {
            control.disabled = false;
        }
    }
}
