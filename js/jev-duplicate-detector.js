const OPENROUTER_DECISIONS_ENDPOINT =
    "https://openrouter.ai/api/alpha/decisions";
const JEV_MODEL = "typesafe/jev-1.14";
const DUPLICATE_SCORE_CUTOFF = 1.5;

const DUPLICATE_CRITERIA = Object.freeze([
    "Completely distinct considerations",
    "Related area, but separate considerations",
    "Same underlying consideration worded differently (counting both double-counts it)",
]);

function pairQuestionKey(firstIndex, secondIndex) {
    return `pair_${firstIndex}_${secondIndex}`;
}

function buildPairQuestions(considerations) {
    const questions = {};
    for (let i = 0; i < considerations.length; i++) {
        for (let j = i + 1; j < considerations.length; j++) {
            questions[pairQuestionKey(i, j)] = {
                type: "score",
                instructions: `To what extent do "${considerations[i]}" and "${considerations[j]}" double-count the same consideration?`,
                criteria: DUPLICATE_CRITERIA,
            };
        }
    }
    return questions;
}

function buildJevRequest(considerations) {
    return {
        model: JEV_MODEL,
        state: {
            context:
                "Considerations listed for the same option in a pros/cons decision.",
            considerations,
        },
        questions: buildPairQuestions(considerations),
    };
}

function extractDuplicatePairs(count, answers = {}) {
    const pairs = [];
    for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
            const score = answers[pairQuestionKey(i, j)]?.score;
            if (typeof score === "number" && score >= DUPLICATE_SCORE_CUTOFF) {
                pairs.push([i, j]);
            }
        }
    }
    return pairs;
}

export function createJevDuplicatePairsDetector({
    apiKey = import.meta.env?.VITE_OPENROUTER_API_KEY,
    fetch = globalThis.fetch,
} = {}) {
    return async function detectDuplicatePairs(considerations) {
        if (!apiKey || considerations.length < 2) {
            return [];
        }

        const response = await fetch(OPENROUTER_DECISIONS_ENDPOINT, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(buildJevRequest(considerations)),
        });

        if (!response.ok) {
            throw new Error(
                `Duplicate detection request failed (${response.status})`,
            );
        }

        const reply = await response.json();
        return extractDuplicatePairs(considerations.length, reply.answers);
    };
}
