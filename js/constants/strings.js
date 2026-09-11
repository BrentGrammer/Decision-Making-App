import {
    CONSIDERATION_TYPE,
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
export const SAVE_LABEL = "Save";
export const LOAD_LABEL = "Load";
export const LOAD_SUCCESS = "Saved decisions loaded.";
export const LOAD_ERROR = "This file could not be loaded.";
export const REPLACE_CONFIRMATION =
    "Loading this file will replace your unsaved changes. Continue?";

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
        "The highest importance and concern ratings count for more: one 10 counts as much as four 5s.",
    [MODELS.cubed.id]:
        "The highest importance and concern ratings count for much more: one 10 counts as much as eight 5s.",
    [MODELS.doubling.id]:
        "The single highest importance or concern rating almost always decides: one 10 counts as much as two 9s, or thirty-two 5s.",
    [MODELS.dealbreaker.id]:
        "A con rated 10 for concern rules that option out entirely. Otherwise every point counts the same.",
});

export const VALIDATION_ERROR_TITLE = "Nothing was calculated";
export const DECISION_NAME_VALIDATION_ERROR =
    "Both decisions need a name before they can be compared. Name them at the top of the decision table.";
export const DECISION_NAME_LENGTH_VALIDATION_ERROR = `Each decision name must be ${DECISION_NAME_MIN_LENGTH}–${DECISION_NAME_MAX_LENGTH} characters.`;
export const CONSIDERATION_ROW_VALIDATION_ERROR =
    "Some rows have a rating but no text, so they cannot be counted. Enter the missing pro or con, or remove the row.";
export const EMPTY_TABLE_VALIDATION_ERROR =
    "Nothing has been rated yet. Enter a pro or con and rate it above 0.";
export const VALIDATION_ERROR_DISMISS = "Back to the decision table";

export const CONCERN_HINT =
    "How much does this worry or concern you? How much could this affect your life negatively? (On a scale of 1–10.)";
export const DEALBREAKER_CONCERN_HINT =
    "How unacceptable is this? Rate a con 10 only if it rules the option out entirely. (On a scale of 1–10.)";

export const TIE_RESULT = "RESULT: Both decisions are equally good(or bad...).";

export function leadResult(winner, loser, points, marginPercent) {
    return `RESULT: ${winner} is better than ${loser} by ${Math.abs(points)} points. The margin is ${marginPercent}% of all points entered.`;
}

function joinWithAnd(phrases) {
    if (phrases.length < 2) {
        return phrases.join("");
    }
    return `${phrases.slice(0, -1).join(", ")} and ${phrases[phrases.length - 1]}`;
}

export function disqualifiedResult(winner, loser, dealbreakers) {
    const ruledOutBy = joinWithAnd(
        dealbreakers.map(({ text, rating }) => `"${text}" (${rating})`),
    );
    return `RESULT: ${winner} wins. ${loser} is disqualified by ${ruledOutBy}.`;
}

export const RESULT_BLOCK = Object.freeze({
    line: "line",
    contributors: "contributors",
});

export const CONTRIBUTOR_COLUMN_LABELS = Object.freeze({
    option: "Decision",
    type: "Pro or con",
    text: "Consideration",
    rating: "Rating",
    share: "Share of all points entered",
});

export function sharePercent(percent) {
    return `${percent}%`;
}

export const CONSIDERATION_TYPE_LABELS = Object.freeze({
    [CONSIDERATION_TYPE.pro]: "pro",
    [CONSIDERATION_TYPE.con]: "con",
});

export const CONTRIBUTORS_CAPTION = "Top contributors";
export const CONTRIBUTORS_HINT_LABEL = "About top contributors";
export const CONTRIBUTORS_HINT =
    "The top pros or cons for each decision and how much weight they had on the result as a percentage.";

export function inFavorOf(decision) {
    return `In favor of ${decision}`;
}

function resultLine(text) {
    return { kind: RESULT_BLOCK.line, text };
}

export function contributorsBlock(winner, loser, { toward, against }) {
    return {
        kind: RESULT_BLOCK.contributors,
        groups: [
            { heading: inFavorOf(winner), rows: toward },
            { heading: inFavorOf(loser), rows: against },
        ].filter((group) => group.rows.length > 0),
    };
}

export function formatComparison(outcome) {
    switch (outcome.kind) {
        case KIND.tie:
            return [resultLine(TIE_RESULT)];
        case KIND.disqualified:
            return [
                resultLine(
                    disqualifiedResult(
                        outcome.winner,
                        outcome.loser,
                        outcome.dealbreakers,
                    ),
                ),
            ];
        case KIND.lead:
            return [
                resultLine(
                    leadResult(
                        outcome.winner,
                        outcome.loser,
                        outcome.points,
                        outcome.marginPercent,
                    ),
                ),
                contributorsBlock(
                    outcome.winner,
                    outcome.loser,
                    outcome.contributors,
                ),
            ];
        default:
            throw new Error(`Unknown comparison kind: ${outcome.kind}`);
    }
}
