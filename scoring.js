export const DECISION_NAME_MIN_LENGTH = 1;
export const DECISION_NAME_MAX_LENGTH = 50;

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
    if (
        nameA.length < DECISION_NAME_MIN_LENGTH ||
        nameB.length < DECISION_NAME_MIN_LENGTH
    ) {
        return "RESULT: Enter both decision names first.";
    }
    if (
        nameA.length > DECISION_NAME_MAX_LENGTH ||
        nameB.length > DECISION_NAME_MAX_LENGTH
    ) {
        return "RESULT: Each decision name must be 1–50 characters.";
    }

    const difference = netScore(prosA, consA) - netScore(prosB, consB);
    if (difference === 0) {
        return "RESULT: Both decisions are equally good(or bad...).";
    }

    const greaterChoice = difference > 0 ? nameA : nameB;
    const lesserChoice = difference > 0 ? nameB : nameA;
    return `RESULT: ${greaterChoice} is better than ${lesserChoice} by ${Math.abs(difference)} points.`;
}
