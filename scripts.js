function start() {
    const decisionA = prompt("Enter Decision A:", "") ?? "";
    const decisionB = prompt("Enter Decision B:", "") ?? "";

    document.getElementById("A").textContent = decisionA;
    document.getElementById("B").textContent = decisionB;
}

function sliderChange (inputObj) {
    var spans = document.getElementsByClassName('sliderStatus');
    var sliders = document.getElementsByClassName('sliders');

    for (i = 0; i < sliders.length; i++) {
        if(inputObj == sliders[i]) {
            spans[i].innerHTML = inputObj.value;
        }
    }
}

function resetSliders() {
    var labels = document.getElementsByClassName('sliderStatus');
    for (var i = 0; i < labels.length; i++) {
        labels[i].textContent = "0";
    }
}

function considerationText(slider) {
    var sliderCell = slider.parentElement;
    var textCell = sliderCell ? sliderCell.previousElementSibling : null;
    if (!textCell) {
        return "";
    }
    var input = textCell.querySelector("input[type='text']");
    return input ? input.value.trim() : "";
}

function sumFilledWeights(sliders) {
    var total = 0;
    for (var i = 0; i < sliders.length; i++) {
        if (!considerationText(sliders[i])) {
            continue;
        }
        total += parseInt(sliders[i].value, 10);
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
