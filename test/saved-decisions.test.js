import { describe, expect, it } from "vitest";
import {
    parseSavedDecisions,
    serializeSavedDecisions,
} from "../js/saved-decisions.js";

const MAX_ROWS_PER_LIST = 100;
const MAX_CONSIDERATION_TEXT_LENGTH = 500;
const MAX_DECISION_NAME_LENGTH = 50;

function validSavedDecisions() {
    return {
        format: "decision-making-app-saved-decisions",
        version: 1,
        model: "squared",
        decisions: [
            {
                name: "Stay",
                pros: [{ text: "Good team", rating: 8 }],
                cons: [{ text: "Long commute", rating: 4 }],
            },
            {
                name: "Leave",
                pros: [{ text: "New challenge", rating: 7 }],
                cons: [{ text: "", rating: 0 }],
            },
        ],
    };
}

describe("saving decisions", () => {
    it("serializes everything needed to restore the decision table", () => {
        const json = serializeSavedDecisions({
            model: "squared",
            decisions: [
                {
                    name: "Stay",
                    pros: [
                        { text: "Good team", weight: "8" },
                        { text: "", weight: "0" },
                    ],
                    cons: [{ text: "Long commute", weight: "4" }],
                },
                {
                    name: "Leave",
                    pros: [{ text: "New challenge", weight: "7" }],
                    cons: [{ text: "", weight: "5" }],
                },
            ],
        });

        expect(JSON.parse(json)).toEqual({
            format: "decision-making-app-saved-decisions",
            version: 1,
            model: "squared",
            decisions: [
                {
                    name: "Stay",
                    pros: [
                        { text: "Good team", rating: 8 },
                        { text: "", rating: 0 },
                    ],
                    cons: [{ text: "Long commute", rating: 4 }],
                },
                {
                    name: "Leave",
                    pros: [{ text: "New challenge", rating: 7 }],
                    cons: [{ text: "", rating: 5 }],
                },
            ],
        });
    });

    it("reads a valid saved decisions file", () => {
        const saved = validSavedDecisions();

        expect(parseSavedDecisions(JSON.stringify(saved))).toEqual(saved);
    });

    it("accepts saved decisions at the row and text limits", () => {
        const saved = validSavedDecisions();
        saved.decisions[0].name = "S".repeat(MAX_DECISION_NAME_LENGTH);
        saved.decisions[0].pros = Array.from(
            { length: MAX_ROWS_PER_LIST },
            () => ({
                text: "x".repeat(MAX_CONSIDERATION_TEXT_LENGTH),
                rating: 10,
            }),
        );

        expect(parseSavedDecisions(JSON.stringify(saved))).toEqual(saved);
    });

    it.each([
        ["malformed JSON", "{"],
        ["a different file format", JSON.stringify({ ...validSavedDecisions(), format: "other" })],
        ["an unsupported version", JSON.stringify({ ...validSavedDecisions(), version: 2 })],
        ["missing decisions", JSON.stringify({ ...validSavedDecisions(), decisions: undefined })],
        ["an unknown scoring model", JSON.stringify({ ...validSavedDecisions(), model: "unknown" })],
        [
            "too many rows in a list",
            JSON.stringify({
                ...validSavedDecisions(),
                decisions: [
                    {
                        ...validSavedDecisions().decisions[0],
                        pros: Array.from(
                            { length: MAX_ROWS_PER_LIST + 1 },
                            () => ({ text: "Pro", rating: 1 }),
                        ),
                    },
                    validSavedDecisions().decisions[1],
                ],
            }),
        ],
        [
            "an overlong decision name",
            JSON.stringify({
                ...validSavedDecisions(),
                decisions: [
                    {
                        ...validSavedDecisions().decisions[0],
                        name: "x".repeat(MAX_DECISION_NAME_LENGTH + 1),
                    },
                    validSavedDecisions().decisions[1],
                ],
            }),
        ],
        [
            "overlong consideration text",
            JSON.stringify({
                ...validSavedDecisions(),
                decisions: [
                    {
                        ...validSavedDecisions().decisions[0],
                        pros: [
                            {
                                text: "x".repeat(
                                    MAX_CONSIDERATION_TEXT_LENGTH + 1,
                                ),
                                rating: 1,
                            },
                        ],
                    },
                    validSavedDecisions().decisions[1],
                ],
            }),
        ],
        [
            "an invalid rating",
            JSON.stringify({
                ...validSavedDecisions(),
                decisions: [
                    {
                        ...validSavedDecisions().decisions[0],
                        pros: [{ text: "Good team", rating: 11 }],
                    },
                    validSavedDecisions().decisions[1],
                ],
            }),
        ],
    ])("rejects %s", (_description, json) => {
        expect(() => parseSavedDecisions(json)).toThrow();
    });
});
