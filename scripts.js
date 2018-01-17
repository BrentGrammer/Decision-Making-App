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
    var spans = document.getElementsByClassName('sliderStatus');
    var sliders = document.getElementsByClassName('sliders');
    //loop through slider objects(sliders class), and check if each slider in the index matches the passed in input object index number, and if it does, then change the span class index of the same number to the input value.

    for (i = 0; i < sliders.length; i++) {
        if(inputObj == sliders[i]) {
            spans[i].innerHTML = inputObj.value;
        }
    }
}

//CALCULATE FUNCTION: Called when User clicks calculate button to get result - this function gathers the values of the sliders that the user has adjusted, and then adds them up to get totals, calculates a total value for each decision, and then the percentage of difference between those totals is calculated to give the user the difference of one choice over the other.

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

//for debugging:

console.log(resultA,resultB);

    //test which value is greater, then subtract the lesser value from the greater and divide the sum by the lesser number
    //multiply that result by 100 to insert into percentage text span.

    if (resultA > resultB) {

        //IF RESULTS ARE NEGATIVE NUMBERS:
        if( (resultB < 0) || (resultA < 0 && resultB < 0) ) {
            var numA = resultA;
            var numB = resultB;

            var difference = Math.abs(numA - numB);

            var numBPos = Math.abs(numB);

            var differenceSum = (difference / numBPos) * 100;
            var percentSum = Math.round(differenceSum);

            document.getElementById('greaterChoice').innerHTML = decisionA;
            document.getElementById('percentage').innerHTML = percentSum;
            document.getElementById('lesserChoice').innerHTML = decisionB;
            //IF RESULTS ARE POSITIVE NUMBERS:
        } else {
                var difference = ((resultA - resultB) / resultB) * 100;
        //round off the number to eliminate decimals
                var percentSum = Math.round(difference);
                document.getElementById('greaterChoice').innerHTML = decisionA;
                document.getElementById('percentage').innerHTML = percentSum;
                document.getElementById('lesserChoice').innerHTML = decisionB;
          }
      //NOW CHECKING IF B > A:
     } else if (resultB > resultA){
          //IF RESULTS ARE NEGATIVE NUMBERS:
            if( (resultA < 0) || (resultA < 0 && resultB < 0) ){
                var numA = resultA;
                var numB = resultB;

                var difference = Math.abs(numA - numB);
          //convert the value of the lesser to positive int for basing percentage difference
                var numAPos = Math.abs(numA);

                var differenceSum = (difference / numAPos) * 100;
                var percentSum = Math.round(differenceSum);

                document.getElementById('greaterChoice').innerHTML = decisionB;
                document.getElementById('percentage').innerHTML = percentSum;
                document.getElementById('lesserChoice').innerHTML = decisionA;

         } //IF POSITIVE
            else {
                var difference = ((resultB - resultA) / resultA) * 100;
                var percentSum = Math.round(difference);
                document.getElementById('greaterChoice').innerHTML = decisionB;
                document.getElementById('percentage').innerHTML = percentSum;
                document.getElementById('lesserChoice').innerHTML = decisionA;
             }

       } else if (resultA == resultB){

              alert("RESULT: Both decisions are equally good(or bad...).");
         }
}
