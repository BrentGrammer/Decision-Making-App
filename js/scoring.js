export const DECISION_NAME_MIN_LENGTH = 1;
export const DECISION_NAME_MAX_LENGTH = 50;

export const KIND = Object.freeze({
    missingNames: "missingNames",
    nameLength: "nameLength",
    tie: "tie",
    lead: "lead",
});

export function trimmedDecisionName(value) {
    return String(value ?? "").trim();
}

export function isValidDecisionName(value) {
    const name = trimmedDecisionName(value);
    return (
        name.length >= DECISION_NAME_MIN_LENGTH &&
        name.length <= DECISION_NAME_MAX_LENGTH
    );
}

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
    const nameA = trimmedDecisionName(decisionA);
    const nameB = trimmedDecisionName(decisionB);
    if (
        nameA.length < DECISION_NAME_MIN_LENGTH ||
        nameB.length < DECISION_NAME_MIN_LENGTH
    ) {
        return { kind: KIND.missingNames };
    }
    if (
        nameA.length > DECISION_NAME_MAX_LENGTH ||
        nameB.length > DECISION_NAME_MAX_LENGTH
    ) {
        return { kind: KIND.nameLength };
    }

    const difference = netScore(prosA, consA) - netScore(prosB, consB);
    if (difference === 0) {
        return { kind: KIND.tie };
    }

    return {
        kind: KIND.lead,
        winner: difference > 0 ? nameA : nameB,
        loser: difference > 0 ? nameB : nameA,
        points: Math.abs(difference),
    };
}
