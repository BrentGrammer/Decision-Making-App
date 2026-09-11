import {
    DECISION_NAME_MAX_LENGTH,
    DECISION_NAME_MIN_LENGTH,
    KIND,
    MODELS,
} from "../scoring.js";

export const DECISION_NAME_FIELD_ERROR = `Enter a name (${DECISION_NAME_MIN_LENGTH}–${DECISION_NAME_MAX_LENGTH} characters).`;
export const DECISION_A_LABEL = "Decision A";
export const DECISION_B_LABEL = "Decision B";
export const PRO_PLACEHOLDER = "Enter a pro";
export const CON_PLACEHOLDER = "Enter a con";
export const REMOVE_PRO_LABEL = "Remove this pro";
export const REMOVE_CON_LABEL = "Remove this con";
export const BLANK_PRO_ERROR = "Enter a pro, or remove this row.";
export const BLANK_CON_ERROR = "Enter a con, or remove this row.";

export const SCORING_MODEL_LABEL = "Try a different model";

export const MODEL_LABELS = Object.freeze({
    [MODELS.linear.id]: "Linear",
    [MODELS.squared.id]: "Squared",
    [MODELS.cubed.id]: "Cubed",
    [MODELS.doubling.id]: "Doubling",
    [MODELS.dealbreaker.id]: "Dealbreaker",
});

export const MODEL_HINTS = Object.freeze({
    [MODELS.linear.id]:
        "Every point counts the same: one 10 counts as much as two 5s.",
    [MODELS.squared.id]:
        "Your highest importance and concern scores count for more: one 10 counts as much as four 5s.",
    [MODELS.cubed.id]:
        "Your highest importance and concern scores count for much more: one 10 counts as much as eight 5s.",
    [MODELS.doubling.id]:
        "The single highest importance or concern score almost always decides: one 10 counts as much as two 9s, or thirty-two 5s.",
    [MODELS.dealbreaker.id]:
        "A con you rate 10 for concern rules that option out entirely. Otherwise every point counts the same.",
});

export const MISSING_NAMES_RESULT = "RESULT: Enter both decision names first.";
export const TIE_RESULT = "RESULT: Both decisions are equally good(or bad...).";
export const NAME_LENGTH_RESULT = `RESULT: Each decision name must be ${DECISION_NAME_MIN_LENGTH}–${DECISION_NAME_MAX_LENGTH} characters.`;

export function leadResult(winner, loser, points, marginPercent) {
    return `RESULT: ${winner} leads ${loser} by ${Math.abs(points)} points — ${marginPercent}% of all points entered.`;
}

export function formatComparison(outcome) {
    switch (outcome.kind) {
        case KIND.missingNames:
            return [MISSING_NAMES_RESULT];
        case KIND.nameLength:
            return [NAME_LENGTH_RESULT];
        case KIND.tie:
            return [TIE_RESULT];
        case KIND.lead:
            return [
                leadResult(
                    outcome.winner,
                    outcome.loser,
                    outcome.points,
                    outcome.marginPercent,
                ),
            ];
        default:
            throw new Error(`Unknown comparison kind: ${outcome.kind}`);
    }
}
