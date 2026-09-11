export const DECISION_NAME_MIN_LENGTH = 1;
export const DECISION_NAME_MAX_LENGTH = 50;

export const KIND = Object.freeze({
    tie: "tie",
    lead: "lead",
    disqualified: "disqualified",
});

export const DEALBREAKER_RATING = 10;

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

export const MODELS = Object.freeze({
    linear: Object.freeze({
        id: "linear",
        transform: (rating) => rating,
    }),
    squared: Object.freeze({
        id: "squared",
        transform: (rating) => rating * rating,
    }),
    cubed: Object.freeze({
        id: "cubed",
        transform: (rating) => rating * rating * rating,
    }),
    doubling: Object.freeze({
        id: "doubling",
        transform: (rating) => (rating === 0 ? 0 : 2 ** rating),
    }),
    dealbreaker: Object.freeze({
        id: "dealbreaker",
        transform: (rating) => rating,
        veto: true,
    }),
});

export const DEFAULT_MODEL_ID = MODELS.squared.id;

export function resolveModel(id) {
    return MODELS[id] ?? MODELS[DEFAULT_MODEL_ID];
}

export function sumFilledWeights(
    considerations,
    transform = MODELS.linear.transform,
) {
    let total = 0;
    for (const consideration of considerations) {
        if (!String(consideration.text ?? "").trim()) {
            continue;
        }
        total += transform(parseInt(consideration.weight, 10));
    }
    return total;
}

export function hasRatedRows({ prosA, consA, prosB, consB }) {
    return [prosA, consA, prosB, consB].some(
        (considerations) => sumFilledWeights(considerations) > 0,
    );
}

function findDealbreakers(cons) {
    const found = [];
    for (const consideration of cons) {
        const text = String(consideration.text ?? "").trim();
        if (text && parseInt(consideration.weight, 10) === DEALBREAKER_RATING) {
            found.push({ text, rating: DEALBREAKER_RATING });
        }
    }
    return found;
}

function netScore(pros, cons, transform) {
    return sumFilledWeights(pros, transform) - sumFilledWeights(cons, transform);
}

const MAX_CONTRIBUTORS_PER_SIDE = 3;

function filledRows(considerations, option, sign, transform) {
    const rows = [];
    for (const consideration of considerations) {
        const text = String(consideration.text ?? "").trim();
        if (!text) {
            continue;
        }
        const rating = parseInt(consideration.weight, 10);
        const favorsWinnerBy = sign * transform(rating);
        if (favorsWinnerBy === 0) {
            continue;
        }
        rows.push({ text, rating, option, favorsWinnerBy });
    }
    return rows;
}

function extractContributor({ text, rating, option }) {
    return { text, rating, option };
}

function findStrongestContributors(rows) {
    const favoringWinner = rows
        .filter((row) => row.favorsWinnerBy > 0)
        .sort((a, b) => b.favorsWinnerBy - a.favorsWinnerBy);
    const favoringLoser = rows
        .filter((row) => row.favorsWinnerBy < 0)
        .sort((a, b) => a.favorsWinnerBy - b.favorsWinnerBy);

    return {
        toward: favoringWinner
            .slice(0, MAX_CONTRIBUTORS_PER_SIDE)
            .map(extractContributor),
        against: favoringLoser
            .slice(0, MAX_CONTRIBUTORS_PER_SIDE)
            .map(extractContributor),
    };
}

export function compareDecisions({
    decisionA,
    decisionB,
    prosA,
    consA,
    prosB,
    consB,
    model,
}) {
    const nameA = trimmedDecisionName(decisionA);
    const nameB = trimmedDecisionName(decisionB);

    const { transform, veto } = resolveModel(model);
    if (veto) {
        const dealbreakersA = findDealbreakers(consA);
        const dealbreakersB = findDealbreakers(consB);
        if (dealbreakersA.length > 0 && dealbreakersB.length === 0) {
            return {
                kind: KIND.disqualified,
                winner: nameB,
                loser: nameA,
                dealbreakers: dealbreakersA,
            };
        }
        if (dealbreakersB.length > 0 && dealbreakersA.length === 0) {
            return {
                kind: KIND.disqualified,
                winner: nameA,
                loser: nameB,
                dealbreakers: dealbreakersB,
            };
        }
    }

    const difference =
        netScore(prosA, consA, transform) - netScore(prosB, consB, transform);
    if (difference === 0) {
        return { kind: KIND.tie };
    }

    const points = Math.abs(difference);
    const weightEntered = [prosA, consA, prosB, consB].reduce(
        (total, considerations) =>
            total + sumFilledWeights(considerations, transform),
        0,
    );

    const aLeads = difference > 0;
    const winner = aLeads ? nameA : nameB;
    const loser = aLeads ? nameB : nameA;
    const towardA = aLeads ? 1 : -1;
    const rows = [
        ...filledRows(prosA, nameA, towardA, transform),
        ...filledRows(consA, nameA, -towardA, transform),
        ...filledRows(prosB, nameB, -towardA, transform),
        ...filledRows(consB, nameB, towardA, transform),
    ];

    return {
        kind: KIND.lead,
        winner,
        loser,
        points,
        marginPercent: Math.round((points / weightEntered) * 100),
        contributors: findStrongestContributors(rows),
    };
}
