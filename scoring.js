export function sumFilledWeights(considerations) {
    let total = 0;
    for (const consideration of considerations) {
        if (!String(consideration.text ?? "").trim()) {
            continue;
        }
        total += parseInt(consideration.weight, 10);
    }
    return total;
}

function netScore(pros, cons) {
    return sumFilledWeights(pros) - sumFilledWeights(cons);
}

export function compareDecisions({
    decisionA,
    decisionB,
    prosA,
    consA,
    prosB,
    consB,
}) {
    const nameA = String(decisionA).trim();
    const nameB = String(decisionB).trim();
    if (!nameA || !nameB) {
        return "RESULT: Enter both decision names first.";
    }

    const difference = netScore(prosA, consA) - netScore(prosB, consB);
    if (difference === 0) {
        return "RESULT: Both decisions are equally good(or bad...).";
    }

    const greaterChoice = difference > 0 ? nameA : nameB;
    const lesserChoice = difference > 0 ? nameB : nameA;
    return `RESULT: ${greaterChoice} is better than ${lesserChoice} by ${Math.abs(difference)} points.`;
}
