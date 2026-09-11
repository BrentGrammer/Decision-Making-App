import { DECISION_NAME_MAX_LENGTH, MODELS } from "./scoring.js";

const FORMAT = "decision-making-app-saved-decisions";
const VERSION = 1;
const INVALID_FILE_ERROR = "Invalid saved decisions file";
export const MAX_SAVED_DECISIONS_FILE_SIZE = 1_000_000;
const MAX_ROWS_PER_LIST = 100;
const MAX_CONSIDERATION_TEXT_LENGTH = 500;

function savedRows(rows) {
    return rows.map(({ text, weight }) => ({
        text,
        rating: Number(weight),
    }));
}

export function serializeSavedDecisions({
    model,
    decisions,
}) {
    return JSON.stringify(
        {
            format: FORMAT,
            version: VERSION,
            model,
            decisions: decisions.map(({ name, pros, cons }) => ({
                name,
                pros: savedRows(pros),
                cons: savedRows(cons),
            })),
        },
        null,
        2,
    );
}

function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSavedRow(row) {
    return (
        isObject(row) &&
        typeof row.text === "string" &&
        row.text.length <= MAX_CONSIDERATION_TEXT_LENGTH &&
        Number.isInteger(row.rating) &&
        row.rating >= 0 &&
        row.rating <= 10
    );
}

function isSavedDecision(decision) {
    return (
        isObject(decision) &&
        typeof decision.name === "string" &&
        decision.name.length <= DECISION_NAME_MAX_LENGTH &&
        Array.isArray(decision.pros) &&
        decision.pros.length > 0 &&
        decision.pros.length <= MAX_ROWS_PER_LIST &&
        decision.pros.every(isSavedRow) &&
        Array.isArray(decision.cons) &&
        decision.cons.length > 0 &&
        decision.cons.length <= MAX_ROWS_PER_LIST &&
        decision.cons.every(isSavedRow)
    );
}

function isSupportedModel(model) {
    return Object.values(MODELS).some(({ id }) => id === model);
}

export function parseSavedDecisions(json) {
    let saved;
    try {
        saved = JSON.parse(json);
    } catch {
        throw new Error(INVALID_FILE_ERROR);
    }

    const isValid =
        isObject(saved) &&
        saved.format === FORMAT &&
        saved.version === VERSION &&
        isSupportedModel(saved.model) &&
        Array.isArray(saved.decisions) &&
        saved.decisions.length === 2 &&
        saved.decisions.every(isSavedDecision);

    if (!isValid) {
        throw new Error(INVALID_FILE_ERROR);
    }
    return saved;
}
