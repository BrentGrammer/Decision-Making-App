import { describe, expect, it, vi } from "vitest";
import { createDuplicateConsiderationsDetector } from "../js/duplicate-considerations-detector.js";

const DUPLICATE_CONSIDERATIONS_ENDPOINT = "/api/duplicate-considerations";

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
    it("returns no groups when fewer than two considerations are given", async () => {
        const fetchMock = mockDuplicatePairsResponse([]);
        const detect = createDuplicateConsiderationsDetector({
            fetch: fetchMock,
        });

        expect(await detect([])).toEqual([]);
        expect(await detect(["Higher salary"])).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("detects duplicate considerations without exposing credentials in the browser", async () => {
        const considerations = [
            "Higher salary",
            "More disposable income",
            "Shorter commute",
        ];
        const fetchMock = mockDuplicatePairsResponse([[0, 1]]);
        const detect = createDuplicateConsiderationsDetector({
            fetch: fetchMock,
        });

        const groups = await detect(considerations);

        expect(groups).toEqual([[0, 1]]);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe(DUPLICATE_CONSIDERATIONS_ENDPOINT);
        expect(options.method).toBe("POST");
        expect(options.headers).toEqual({
            "Content-Type": "application/json",
        });
        expect(JSON.parse(options.body)).toEqual({ considerations });
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

    it("reports an error when duplicate detection is unavailable", async () => {
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
