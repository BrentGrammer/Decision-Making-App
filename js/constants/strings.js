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
    return `RESULT: ${winner} leads ${loser} by ${Math.abs(points)} points — ${marginPercent}% of all points entered.`;
}

function formatContributor(contributor) {
    return `${contributor.option}'s "${contributor.text}" (${contributor.rating})`;
}

function joinWithAnd(phrases) {
    if (phrases.length < 2) {
        return phrases.join("");
    }
    return `${phrases.slice(0, -1).join(", ")} and ${phrases[phrases.length - 1]}`;
}

function formatContributorList(contributors) {
    return joinWithAnd(contributors.map(formatContributor));
}

export function disqualifiedResult(winner, loser, dealbreakers) {
    const ruledOutBy = joinWithAnd(
        dealbreakers.map(({ text, rating }) => `"${text}" (${rating})`),
    );
    return `RESULT: ${winner} wins. ${loser} is disqualified by ${ruledOutBy}.`;
}

export function contributorsResult(winner, loser, { toward, against }) {
    const lead = `Most of ${winner}'s lead comes from ${formatContributorList(toward)}.`;
    if (against.length === 0) {
        return lead;
    }
    return `${lead} In favor of ${loser}: ${formatContributorList(against)}.`;
}

export function formatComparison(outcome) {
    switch (outcome.kind) {
        case KIND.tie:
            return [TIE_RESULT];
        case KIND.disqualified:
            return [
                disqualifiedResult(
                    outcome.winner,
                    outcome.loser,
                    outcome.dealbreakers,
                ),
            ];
        case KIND.lead:
            return [
                leadResult(
                    outcome.winner,
                    outcome.loser,
                    outcome.points,
                    outcome.marginPercent,
                ),
                contributorsResult(
                    outcome.winner,
                    outcome.loser,
                    outcome.contributors,
                ),
            ];
        default:
            throw new Error(`Unknown comparison kind: ${outcome.kind}`);
    }
}
