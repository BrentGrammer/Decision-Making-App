import { describe, expect, it, vi } from "vitest";
import { createDuplicateConsiderationsDetector } from "../js/duplicate-considerations-detector.js";

function mockDuplicatePairsResponse(
    duplicatePairs,
    { status = 200, ok = true } = {},
) {
    return vi.fn(async () => ({
        ok,
        status,
        json: async () => ({ duplicatePairs }),
    }));
}

describe("duplicate considerations detector", () => {
    it("returns no groups without calling fetch when fewer than two considerations are given", async () => {
        const fetchMock = mockDuplicatePairsResponse([]);
        const detect = createDuplicateConsiderationsDetector({
            fetch: fetchMock,
        });

        expect(await detect([])).toEqual([]);
        expect(await detect(["Higher salary"])).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("posts considerations to /api/duplicate-considerations without exposing an API key", async () => {
        const fetchMock = mockDuplicatePairsResponse([[0, 1]]);
        const detect = createDuplicateConsiderationsDetector({
            fetch: fetchMock,
        });

        const groups = await detect([
            "Higher salary",
            "More disposable income",
            "Shorter commute",
        ]);

        expect(groups).toEqual([[0, 1]]);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/duplicate-considerations");
        expect(options.method).toBe("POST");
        expect(options.headers).toEqual({
            "Content-Type": "application/json",
        });
        expect(JSON.parse(options.body)).toEqual({
            considerations: [
                "Higher salary",
                "More disposable income",
                "Shorter commute",
            ],
        });
    });

    it("merges connected duplicate pairs into one group and keeps separate groups apart", async () => {
        const fetchMock = mockDuplicatePairsResponse([
            [0, 1],
            [1, 2],
            [3, 4],
        ]);
        const detect = createDuplicateConsiderationsDetector({
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
        const fetchMock = mockDuplicatePairsResponse([], {
            ok: false,
            status: 502,
        });
        const detect = createDuplicateConsiderationsDetector({
            fetch: fetchMock,
        });

        await expect(
            detect(["Higher salary", "Better finances"]),
        ).rejects.toThrow(/502/);
    });
});
