import { describe, expect, it, vi } from "vitest";
import { createDuplicateConsiderationsDetector } from "../js/duplicate-considerations-detector.js";

function mockDecisionsResponse(scoresByPair, { status = 200, ok = true } = {}) {
    const answers = {};
    for (const [key, score] of Object.entries(scoresByPair)) {
        answers[key] = { score };
    }
    return vi.fn(async () => ({
        ok,
        status,
        json: async () => ({ answers }),
    }));
}

describe("duplicate considerations detector", () => {
    it("returns no groups without calling fetch when fewer than two considerations are given", async () => {
        const fetchMock = mockDecisionsResponse({});
        const detect = createDuplicateConsiderationsDetector({
            apiKey: "test-key",
            fetch: fetchMock,
        });

        expect(await detect([])).toEqual([]);
        expect(await detect(["Higher salary"])).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns no groups without calling fetch when no API key is configured", async () => {
        const fetchMock = mockDecisionsResponse({});
        const detect = createDuplicateConsiderationsDetector({
            apiKey: "",
            fetch: fetchMock,
        });

        expect(await detect(["Higher salary", "Better pay"])).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("sends one batched score request quoting each pair of considerations", async () => {
        const fetchMock = mockDecisionsResponse({
            pair_0_1: 1.72,
            pair_0_2: 0.25,
            pair_1_2: 0.31,
        });
        const detect = createDuplicateConsiderationsDetector({
            apiKey: "test-key",
            fetch: fetchMock,
        });

        await detect(["Higher salary", "More disposable income", "Shorter commute"]);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe("https://openrouter.ai/api/alpha/decisions");
        expect(options.method).toBe("POST");
        expect(options.headers).toEqual({
            Authorization: "Bearer test-key",
            "Content-Type": "application/json",
        });

        const body = JSON.parse(options.body);
        expect(body.model).toBe("typesafe/jev-1.14");
        expect(body.state.considerations).toEqual([
            "Higher salary",
            "More disposable income",
            "Shorter commute",
        ]);
        expect(Object.keys(body.questions)).toEqual([
            "pair_0_1",
            "pair_0_2",
            "pair_1_2",
        ]);
        expect(body.questions.pair_0_1.type).toBe("score");
        expect(body.questions.pair_0_1.instructions).toContain('"Higher salary"');
        expect(body.questions.pair_0_1.instructions).toContain(
            '"More disposable income"',
        );
        expect(body.questions.pair_0_1.criteria).toHaveLength(3);
    });

    it("flags pairs at or above the 1.5 cutoff and ignores pairs below it", async () => {
        const fetchMock = mockDecisionsResponse({
            pair_0_1: 1.5,
            pair_0_2: 1.49,
            pair_1_2: 0.8,
        });
        const detect = createDuplicateConsiderationsDetector({
            apiKey: "test-key",
            fetch: fetchMock,
        });

        const groups = await detect([
            "Higher salary",
            "More disposable income",
            "Better benefits",
        ]);

        expect(groups).toEqual([[0, 1]]);
    });

    it("merges connected duplicate pairs into one group and keeps separate groups apart", async () => {
        const fetchMock = mockDecisionsResponse({
            pair_0_1: 1.63,
            pair_0_2: 1.42,
            pair_1_2: 1.78,
            pair_0_3: 0.2,
            pair_1_3: 0.2,
            pair_2_3: 0.2,
            pair_0_4: 0.2,
            pair_1_4: 0.2,
            pair_2_4: 0.2,
            pair_3_4: 1.85,
        });
        const detect = createDuplicateConsiderationsDetector({
            apiKey: "test-key",
            fetch: fetchMock,
        });

        const groups = await detect([
            "Higher salary",
            "More disposable income",
            "Better finances",
            "Long hours",
            "Working late most nights",
        ]);

        expect(groups).toEqual([
            [0, 1, 2],
            [3, 4],
        ]);
    });

    it("throws when the API returns a non-OK response", async () => {
        const fetchMock = mockDecisionsResponse({}, { ok: false, status: 401 });
        const detect = createDuplicateConsiderationsDetector({
            apiKey: "bad-key",
            fetch: fetchMock,
        });

        await expect(
            detect(["Higher salary", "Better finances"]),
        ).rejects.toThrow(/401/);
    });
});
