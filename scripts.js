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
}

function considerationText(slider) {
    const textCell = slider.parentElement?.previousElementSibling;
    if (!textCell) {
        return "";
    }
    const input = textCell.querySelector("input[type='text']");
    return input ? input.value.trim() : "";
}

function sumFilledWeights(sliders) {
    let total = 0;
    for (const slider of sliders) {
        if (!considerationText(slider)) {
            continue;
        }
        total += parseInt(slider.value, 10);
    }
    return total;
}

function calculate() {
    const prosASum = sumFilledWeights(document.getElementsByClassName('prosA'));
    const consASum = sumFilledWeights(document.getElementsByClassName('consA'));
    const prosBSum = sumFilledWeights(document.getElementsByClassName('prosB'));
    const consBSum = sumFilledWeights(document.getElementsByClassName('consB'));

    const resultA = prosASum - consASum;
    const resultB = prosBSum - consBSum;
    const difference = resultA - resultB;
    const resultEl = document.getElementById("finalResult");
    const decisionA = document.getElementById("A").textContent.trim();
    const decisionB = document.getElementById("B").textContent.trim();

    if (!decisionA || !decisionB) {
        resultEl.textContent = "RESULT: Enter both decision names first.";
        return;
    }

    if (difference === 0) {
        resultEl.textContent = "RESULT: Both decisions are equally good(or bad...).";
        return;
    }

    const greaterChoice = difference > 0 ? decisionA : decisionB;
    const lesserChoice = difference > 0 ? decisionB : decisionA;

    resultEl.textContent =
        `RESULT: ${greaterChoice} is better than ${lesserChoice} by ${Math.abs(difference)} points.`;
}
