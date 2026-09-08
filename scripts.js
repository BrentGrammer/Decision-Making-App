function start() {
    decisionA = prompt("Enter Decision A:","");
    decisionB = prompt("Enter Decision B:","");

    document.getElementById('A').innerHTML = decisionA;
    document.getElementById('B').innerHTML = decisionB;
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
    var prosASum = sumFilledWeights(document.getElementsByClassName('prosA'));
    var consASum = sumFilledWeights(document.getElementsByClassName('consA'));
    var prosBSum = sumFilledWeights(document.getElementsByClassName('prosB'));
    var consBSum = sumFilledWeights(document.getElementsByClassName('consB'));

    var resultA = prosASum - consASum;
    var resultB = prosBSum - consBSum;
    var difference = resultA - resultB;

    console.log(resultA, resultB, difference);

    if (difference === 0) {
        alert("RESULT: Both decisions are equally good(or bad...).");
        return;
    }

    var greaterChoice = difference > 0 ? decisionA : decisionB;
    var lesserChoice = difference > 0 ? decisionB : decisionA;

    document.getElementById('greaterChoice').innerHTML = greaterChoice;
    document.getElementById('lesserChoice').innerHTML = lesserChoice;
    document.getElementById('difference').innerHTML = Math.abs(difference);
}
