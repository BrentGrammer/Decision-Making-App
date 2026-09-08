/*
VARIABLES:
decisionA, decisionB = user entered decisions from prompts
*/

//this is called when user clicks start button on home page.
function start() {
    //decisions A and B are declared globally (by not using var and not being declared beforehand) for use in the calculate function.

     decisionA = prompt("Enter Decision A:","");
     decisionB = prompt("Enter Decision B:","");

    //inserts user prompt inputs to decision A and B cells in table<th>.
    document.getElementById('A').innerHTML = decisionA;
    document.getElementById('B').innerHTML = decisionB;
}

//this is called when the slider is changed to update value on screen:
function sliderChange (inputObj) {
    var spans = document.getElementsByClassName('sliderStatus');  //value shown on screen
    var sliders = document.getElementsByClassName('sliders'); //select the ranges inputs
    //loop through slider objects(sliders class), and check if each slider in the index matches the passed in input object index number, and if it does, then change the span class index of the same number to the input value.

    for (i = 0; i < sliders.length; i++) {
        if(inputObj == sliders[i]) {
            spans[i].innerHTML = inputObj.value;
        }
    }
}

//called when the reset button is hit to set slider values back to 5:
function resetSliders() {
     spans = document.getElementsByClassName('sliderStatus');
    console.log(spans); //debugging
  //loop through spans around the shown value in sliders, and change each span.innerhtml to 5:
    //for (i = 0; i < spans.length; i++) {
        //spans[i].innerHTML = '5';
    }
//}

//CALCULATE FUNCTION: Called when User clicks calculate button to get result - this function gathers the values of the sliders that the user has adjusted, and then adds them up to get totals, calculates a net score for each decision (pros minus cons), and reports how many weighted points the leader is ahead.

function calculate() {
    //gather the 4 groups of sliders and assign variables to each group collection
    var slidersProsA = document.getElementsByClassName('prosA');
    var slidersConsA = document.getElementsByClassName('consA');
    var slidersProsB = document.getElementsByClassName('prosB');
    var slidersConsB = document.getElementsByClassName('consB');

    //make empty arrays to put the values of each group of sliders in.
    var aProValues = [];
    var aConValues = [];
    var bProValues = [];
    var bConValues = [];
    /*grab the value property of each slider using a for loop for each group and push the values to the corresponding array.  Convert them to numbers for later arithmetic using the parseInt method. make a for loop for each group of sliders.*/

    //for prosA
    for (var i = 0; i < slidersProsA.length; i++) {

        var val = parseInt(slidersProsA[i].value);
        aProValues.push(val);
    }
    //grabbing consA slider values
    for (var i = 0; i < slidersConsA.length; i++) {

        var val2 = parseInt(slidersConsA[i].value);
        aConValues.push(val2);
    }

    //grabbing prosB slider values
    for (var i = 0; i < slidersProsB.length; i++){

        var val3 = parseInt(slidersProsB[i].value);
        bProValues.push(val3);
    }
    //grabbing consB slider values
    for (var i = 0; i < slidersConsB.length; i++){

        var val4 = parseInt(slidersConsB[i].value);
        bConValues.push(val4);
    }

   //numeric values for the groups of sliders are now stored in 4 arrays: aProValues, aConValues, bProValues,bConValues

    //create variables for each sum of slider groups and assign them to the reduce() method of each array:

    var prosASum = aProValues.reduce(function(total, sum){return total + sum;}, 0);
    var consASum = aConValues.reduce(function(total, sum){return total + sum;}, 0);
    var prosBSum = bProValues.reduce(function(total, sum){return total + sum;}, 0);
    var consBSum = bConValues.reduce(function(total, sum){return total + sum;}, 0);

    //(the numerical sums of each of the groups of slider values are now stored in above variables)

    //Get a total value result for pros/cons of A and pros/cons of B: Subtract consASum from prosASum and assign a variable.  subtract consBSum from prosBSum and assign a variable.

    var resultA = prosASum - consASum;
    var resultB = prosBSum - consBSum;
    var difference = resultA - resultB;

    console.log(resultA, resultB, difference);

    // Net scores are interval-scale: the meaningful comparison is the point difference, not a ratio.
    // Ties still only alert (result paragraph is left as-is until that bug is fixed separately).
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
