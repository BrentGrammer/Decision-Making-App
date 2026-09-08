import {
    DECISION_NAME_MAX_LENGTH,
    DECISION_NAME_MIN_LENGTH,
    KIND,
} from "../scoring.js";

export const DECISION_NAME_FIELD_ERROR = `Enter a name (${DECISION_NAME_MIN_LENGTH}–${DECISION_NAME_MAX_LENGTH} characters).`;
export const PRO_PLACEHOLDER = "Enter a pro";
export const CON_PLACEHOLDER = "Enter a con";
export const REMOVE_PRO_LABEL = "Remove this pro";
export const REMOVE_CON_LABEL = "Remove this con";
export const BLANK_PRO_ERROR = "Enter a pro, or remove this row.";
export const BLANK_CON_ERROR = "Enter a con, or remove this row.";

export const MISSING_NAMES_RESULT = "RESULT: Enter both decision names first.";
export const TIE_RESULT = "RESULT: Both decisions are equally good(or bad...).";
export const NAME_LENGTH_RESULT = `RESULT: Each decision name must be ${DECISION_NAME_MIN_LENGTH}–${DECISION_NAME_MAX_LENGTH} characters.`;

export function leadResult(winner, loser, points) {
    return `RESULT: ${winner} is better than ${loser} by ${Math.abs(points)} points.`;
}

export function formatComparison(outcome) {
    switch (outcome.kind) {
        case KIND.missingNames:
            return MISSING_NAMES_RESULT;
        case KIND.nameLength:
            return NAME_LENGTH_RESULT;
        case KIND.tie:
            return TIE_RESULT;
        case KIND.lead:
            return leadResult(outcome.winner, outcome.loser, outcome.points);
        default:
            throw new Error(`Unknown comparison kind: ${outcome.kind}`);
    }
}
