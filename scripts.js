import { compareDecisions } from "./scoring.js";

function start() {
    const decisionA = prompt("Enter Decision A:", "") ?? "";
    const decisionB = prompt("Enter Decision B:", "") ?? "";

    document.getElementById("A").textContent = decisionA;
    document.getElementById("B").textContent = decisionB;
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
    document.getElementById("A").textContent = "";
    document.getElementById("B").textContent = "";
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
    document.getElementById("finalResult").textContent = compareDecisions({
        decisionA: document.getElementById("A").textContent,
        decisionB: document.getElementById("B").textContent,
        prosA: considerationsFrom(document.getElementsByClassName("prosA")),
        consA: considerationsFrom(document.getElementsByClassName("consA")),
        prosB: considerationsFrom(document.getElementsByClassName("prosB")),
        consB: considerationsFrom(document.getElementsByClassName("consB")),
    });
}

function initApp() {
    window.start = start;
    window.sliderChange = sliderChange;
    window.resetSliders = resetSliders;
    window.calculate = calculate;

    for (const slider of document.getElementsByClassName("sliders")) {
        slider.addEventListener("input", function () {
            sliderChange(this);
        });
    }
}

export { start, sliderChange, resetSliders, calculate, initApp };
