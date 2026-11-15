import { describe, expect, it, vi } from "vitest";
import {
    createCloudDecisionsStore,
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

describe("cloud decisions store", () => {
    it("fetches the current user and returns null when unauthenticated or offline", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    user: { id: "u1", email: "a@b.com", name: "Alex" },
                }),
            })
            .mockRejectedValueOnce(new Error("offline"));
        const store = createCloudDecisionsStore({ fetch: fetchMock });

        expect(await store.getUser()).toEqual({
            id: "u1",
            email: "a@b.com",
            name: "Alex",
        });
        expect(await store.getUser()).toBeNull();
    });

    it("creates, updates, lists, loads, and removes saved decisions via /api/decisions", async () => {
        const saved = validSavedDecisions();
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: "d1", title: "Stay vs. Leave" }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: "d1", title: "Stay vs. Leave" }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    decisions: [{ id: "d1", title: "Stay vs. Leave" }],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                text: async () => JSON.stringify(saved),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ deleted: true }),
            });
        const store = createCloudDecisionsStore({ fetch: fetchMock });

        expect(await store.save(JSON.stringify(saved), null)).toEqual({
            id: "d1",
            title: "Stay vs. Leave",
        });
        expect(fetchMock.mock.calls[0][0]).toBe("/api/decisions");
        expect(fetchMock.mock.calls[0][1].method).toBe("POST");

        expect(await store.save(JSON.stringify(saved), "d1")).toEqual({
            id: "d1",
            title: "Stay vs. Leave",
        });
        expect(fetchMock.mock.calls[1][0]).toBe("/api/decisions/d1");
        expect(fetchMock.mock.calls[1][1].method).toBe("PUT");

        expect(await store.list()).toEqual([
            { id: "d1", title: "Stay vs. Leave" },
        ]);
        expect(await store.get("d1")).toEqual(saved);
        await store.remove("d1");
        expect(fetchMock.mock.calls[4][0]).toBe("/api/decisions/d1");
        expect(fetchMock.mock.calls[4][1].method).toBe("DELETE");
    });
});
