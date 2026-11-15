import { describe, it, expect, vi } from "vitest";
import worker from "../src/worker.js";

function mockUpstreamDecisionsResponse(
    scoresByPair,
    { status = 200, ok = true } = {},
) {
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

describe("Cloudflare Worker entrypoint", () => {
    it("delegates non-API requests to env.ASSETS.fetch", async () => {
        const assetResponse = new Response("<html></html>", { status: 200 });
        const env = {
            ASSETS: {
                fetch: vi.fn().mockResolvedValue(assetResponse),
            },
        };
        const request = new Request("https://example.com/index.html");

        const response = await worker.fetch(request, env);

        expect(env.ASSETS.fetch).toHaveBeenCalledWith(request);
        expect(response).toBe(assetResponse);
    });

    it("returns 404 JSON for unknown /api/* routes", async () => {
        const env = {
            ASSETS: {
                fetch: vi.fn(),
            },
        };
        const request = new Request("https://example.com/api/unknown");

        const response = await worker.fetch(request, env);

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: "Not found" });
        expect(env.ASSETS.fetch).not.toHaveBeenCalled();
    });

    describe("POST /api/duplicate-considerations", () => {
        it("returns 400 when considerations is missing or not an array of strings", async () => {
            const env = { OPENROUTER_API_KEY: "secret-key" };
            const request = new Request(
                "https://example.com/api/duplicate-considerations",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ considerations: [123] }),
                },
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({
                error: "Invalid considerations",
            });
        });

        it("returns empty duplicatePairs without calling upstream when OPENROUTER_API_KEY is unset", async () => {
            const fetchMock = mockUpstreamDecisionsResponse({});
            const env = { OPENROUTER_API_KEY: "" };
            const request = new Request(
                "https://example.com/api/duplicate-considerations",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        considerations: ["Higher salary", "Better pay"],
                    }),
                },
            );

            const response = await worker.fetch(request, env, {
                fetch: fetchMock,
            });

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ duplicatePairs: [] });
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it("calls upstream using env.OPENROUTER_API_KEY and returns duplicatePairs at or above 1.5", async () => {
            const fetchMock = mockUpstreamDecisionsResponse({
                pair_0_1: 1.5,
                pair_0_2: 1.49,
                pair_1_2: 0.31,
            });
            const env = { OPENROUTER_API_KEY: "server-secret-key" };
            const request = new Request(
                "https://example.com/api/duplicate-considerations",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        considerations: [
                            "Higher salary",
                            "More disposable income",
                            "Shorter commute",
                        ],
                    }),
                },
            );

            const response = await worker.fetch(request, env, {
                fetch: fetchMock,
            });

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({
                duplicatePairs: [[0, 1]],
            });
            expect(fetchMock).toHaveBeenCalledTimes(1);
            const [, options] = fetchMock.mock.calls[0];
            expect(options.headers.Authorization).toBe(
                "Bearer server-secret-key",
            );
            const body = JSON.parse(options.body);
            expect(body.questions.pair_0_1.type).toBe("score");
            expect(body.questions.pair_0_1.instructions).toContain(
                '"Higher salary"',
            );
            expect(body.questions.pair_0_1.instructions).toContain(
                '"More disposable income"',
            );
        });

        it("returns 502 when the upstream request fails", async () => {
            const fetchMock = mockUpstreamDecisionsResponse(
                {},
                { ok: false, status: 500 },
            );
            const env = { OPENROUTER_API_KEY: "server-secret-key" };
            const request = new Request(
                "https://example.com/api/duplicate-considerations",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        considerations: ["Higher salary", "Better pay"],
                    }),
                },
            );

            const response = await worker.fetch(request, env, {
                fetch: fetchMock,
            });

            expect(response.status).toBe(502);
        });
    });
});
