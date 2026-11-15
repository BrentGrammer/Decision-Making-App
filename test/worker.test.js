// @vitest-environment node
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getPlatformProxy } from "wrangler";
import worker, { CONTENT_SECURITY_POLICY } from "../worker/worker.js";

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

function buildJwtIdToken(payload) {
    const encode = (obj) =>
        Buffer.from(JSON.stringify(obj)).toString("base64url");
    return `${encode({ alg: "RS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

function cookiePair(setCookieHeader, name) {
    for (const header of setCookieHeader) {
        const [pair] = header.split(";");
        if (pair.startsWith(`${name}=`)) {
            return pair;
        }
    }
    return "";
}

function validSavedDecisions(nameA = "Stay", nameB = "Leave") {
    return {
        format: "decision-making-app-saved-decisions",
        version: 1,
        model: "squared",
        decisions: [
            {
                name: nameA,
                pros: [{ text: "Good team", rating: 8 }],
                cons: [{ text: "Long commute", rating: 4 }],
            },
            {
                name: nameB,
                pros: [{ text: "New challenge", rating: 7 }],
                cons: [{ text: "", rating: 0 }],
            },
        ],
    };
}

describe("application server", () => {
    let platform;
    let db;

    beforeAll(async () => {
        platform = await getPlatformProxy({ persist: false });
        db = platform.env.DB;
        const sql = readFileSync("schema.sql", "utf8");
        const statements = sql
            .split(";")
            .map((statement) => statement.trim())
            .filter(Boolean)
            .map((statement) => db.prepare(statement));
        await db.batch(statements);
    });

    afterAll(async () => {
        await platform?.dispose();
    });

    beforeEach(async () => {
        await db.batch([
            db.prepare("DELETE FROM saved_decisions"),
            db.prepare("DELETE FROM sessions"),
            db.prepare("DELETE FROM users"),
        ]);
    });

    async function signInTestUser({
        sub = "google-sub-123",
        email = "alex@example.com",
        name = "Alex Rivera",
    } = {}) {
        const env = {
            DB: db,
            GOOGLE_CLIENT_ID: "google-client-id",
            GOOGLE_CLIENT_SECRET: "google-client-secret",
        };
        const startResponse = await worker.fetch(
            new Request("https://example.com/api/auth/google"),
            env,
        );
        const stateCookie = cookiePair(
            startResponse.headers.getSetCookie(),
            "oauth_state",
        );
        const state = stateCookie.split("=")[1];

        const fetchMock = vi.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({
                id_token: buildJwtIdToken({ sub, email, name }),
            }),
        }));

        const callbackResponse = await worker.fetch(
            new Request(
                `https://example.com/api/auth/google/callback?code=auth-code&state=${state}`,
                {
                    headers: { Cookie: stateCookie },
                },
            ),
            env,
            { fetch: fetchMock },
        );

        return {
            env,
            fetchMock,
            callbackResponse,
            sessionCookie: cookiePair(
                callbackResponse.headers.getSetCookie(),
                "session_token",
            ),
        };
    }

    it("serves static pages with the content security policy", async () => {
        const assetResponse = new Response("<html></html>", { status: 200 });
        const env = {
            ASSETS: {
                fetch: vi.fn().mockResolvedValue(assetResponse),
            },
        };
        const request = new Request("https://example.com/index.html");

        const response = await worker.fetch(request, env);

        expect(env.ASSETS.fetch).toHaveBeenCalledWith(request);
        expect(response.headers.get("Content-Security-Policy")).toBe(
            CONTENT_SECURITY_POLICY,
        );
    });

    it("reports not found for unknown API routes", async () => {
        const env = {
            ASSETS: {
                fetch: vi.fn(),
            },
        };
        const request = new Request("https://example.com/api/unknown");

        const response = await worker.fetch(request, env);

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: "Not found" });
        expect(response.headers.get("Content-Security-Policy")).toBe(
            CONTENT_SECURITY_POLICY,
        );
        expect(env.ASSETS.fetch).not.toHaveBeenCalled();
    });

    describe("detecting duplicate considerations", () => {
        it("rejects a request without a valid list of considerations", async () => {
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
        });

        it("returns no duplicates when the detector is not configured", async () => {
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

        it("flags pairs of considerations scored at or above the 1.5 duplicate cutoff", async () => {
            const firstConsideration = "Higher salary";
            const secondConsideration = "More disposable income";
            const thirdConsideration = "Shorter commute";
            const secretKey = "server-secret-key";
            const fetchMock = mockUpstreamDecisionsResponse({
                pair_0_1: 1.5,
                pair_0_2: 1.49,
                pair_1_2: 0.31,
            });
            const env = { OPENROUTER_API_KEY: secretKey };
            const request = new Request(
                "https://example.com/api/duplicate-considerations",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        considerations: [
                            firstConsideration,
                            secondConsideration,
                            thirdConsideration,
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
            expect(options.headers.Authorization).toBe(`Bearer ${secretKey}`);
            const body = JSON.parse(options.body);
            expect(body.questions.pair_0_1.type).toBe("score");
            expect(body.questions.pair_0_1.instructions).toContain(
                `"${firstConsideration}"`,
            );
            expect(body.questions.pair_0_1.instructions).toContain(
                `"${secondConsideration}"`,
            );
        });

        it("reports a service error when the upstream detector fails", async () => {
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

    describe("signing in with Google", () => {
        it("reports no signed-in user before login", async () => {
            const response = await worker.fetch(
                new Request("https://example.com/api/auth/me"),
                { DB: db },
            );

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({ user: null });
        });

        it("sends the user to Google sign-in with CSRF state protection", async () => {
            const clientId = "google-client-id";
            const origin = "https://example.com";
            const response = await worker.fetch(
                new Request(`${origin}/api/auth/google`),
                {
                    DB: db,
                    GOOGLE_CLIENT_ID: clientId,
                },
            );

            expect(response.status).toBe(302);
            const location = new URL(response.headers.get("Location"));
            expect(location.searchParams.get("client_id")).toBe(clientId);
            expect(location.searchParams.get("redirect_uri")).toBe(
                `${origin}/api/auth/google/callback`,
            );
            expect(location.searchParams.get("response_type")).toBe("code");
            const state = location.searchParams.get("state");
            expect(state).toBeTruthy();
            expect(
                cookiePair(response.headers.getSetCookie(), "oauth_state"),
            ).toBe(`oauth_state=${state}`);
        });

        it("rejects a Google sign-in callback with a mismatched CSRF state", async () => {
            const response = await worker.fetch(
                new Request(
                    "https://example.com/api/auth/google/callback?code=abc&state=wrong",
                    {
                        headers: { Cookie: "oauth_state=expected" },
                    },
                ),
                {
                    DB: db,
                    GOOGLE_CLIENT_ID: "google-client-id",
                    GOOGLE_CLIENT_SECRET: "google-client-secret",
                },
            );

            expect(response.status).toBe(400);
        });

        it("signs the user in after Google approval, remembers their session, and signs them out", async () => {
            const email = "alex@example.com";
            const name = "Alex Rivera";
            const { env, callbackResponse, sessionCookie } =
                await signInTestUser({
                    sub: "google-sub-42",
                    email,
                    name,
                });

            expect(callbackResponse.status).toBe(302);
            expect(callbackResponse.headers.get("Location")).toBe("/");
            expect(sessionCookie).toMatch(/^session_token=.+/);

            const meResponse = await worker.fetch(
                new Request("https://example.com/api/auth/me", {
                    headers: { Cookie: sessionCookie },
                }),
                env,
            );
            expect(meResponse.status).toBe(200);
            const { user } = await meResponse.json();
            expect(user).toEqual({
                id: expect.any(String),
                email,
                name,
            });

            const logoutResponse = await worker.fetch(
                new Request("https://example.com/api/auth/logout", {
                    method: "POST",
                    headers: { Cookie: sessionCookie },
                }),
                env,
            );
            expect(logoutResponse.status).toBe(200);

            const afterLogout = await worker.fetch(
                new Request("https://example.com/api/auth/me", {
                    headers: { Cookie: sessionCookie },
                }),
                env,
            );
            expect(await afterLogout.json()).toEqual({ user: null });
        });
    });

    describe("per-user saved decisions", () => {
        it("requires a user to be signed in to access saved decisions", async () => {
            const response = await worker.fetch(
                new Request("https://example.com/api/decisions"),
                { DB: db },
            );

            expect(response.status).toBe(401);
        });

        it("rejects saving an invalid decision comparison", async () => {
            const { env, sessionCookie } = await signInTestUser();

            const response = await worker.fetch(
                new Request("https://example.com/api/decisions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Cookie: sessionCookie,
                    },
                    body: JSON.stringify({ model: "invalid" }),
                }),
                env,
            );

            expect(response.status).toBe(400);
        });

        it("lets each signed-in user save, list, load, update, and delete only their own decisions", async () => {
            const initialDecisionA = "Stay";
            const initialDecisionB = "Leave";
            const initialTitle = `${initialDecisionA} vs. ${initialDecisionB}`;
            const updatedDecisionA = "Remote";
            const updatedDecisionB = "Hybrid";
            const updatedTitle = `${updatedDecisionA} vs. ${updatedDecisionB}`;

            const alice = await signInTestUser({
                sub: "alice-sub",
                email: "alice@example.com",
                name: "Alice",
            });
            const bob = await signInTestUser({
                sub: "bob-sub",
                email: "bob@example.com",
                name: "Bob",
            });

            const initialSaved = validSavedDecisions(
                initialDecisionA,
                initialDecisionB,
            );
            const createResponse = await worker.fetch(
                new Request("https://example.com/api/decisions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Cookie: alice.sessionCookie,
                    },
                    body: JSON.stringify(initialSaved),
                }),
                alice.env,
            );
            expect(createResponse.status).toBe(201);
            const created = await createResponse.json();
            expect(created).toEqual({
                id: expect.any(String),
                title: initialTitle,
            });

            const listResponse = await worker.fetch(
                new Request("https://example.com/api/decisions", {
                    headers: { Cookie: alice.sessionCookie },
                }),
                alice.env,
            );
            expect(listResponse.status).toBe(200);
            expect(await listResponse.json()).toEqual({
                decisions: [
                    {
                        id: created.id,
                        title: initialTitle,
                        updated_at: expect.any(String),
                    },
                ],
            });

            const bobGetResponse = await worker.fetch(
                new Request(`https://example.com/api/decisions/${created.id}`, {
                    headers: { Cookie: bob.sessionCookie },
                }),
                bob.env,
            );
            expect(bobGetResponse.status).toBe(404);

            const getResponse = await worker.fetch(
                new Request(`https://example.com/api/decisions/${created.id}`, {
                    headers: { Cookie: alice.sessionCookie },
                }),
                alice.env,
            );
            expect(getResponse.status).toBe(200);
            expect(await getResponse.json()).toEqual({
                id: created.id,
                title: initialTitle,
                ...initialSaved,
            });

            const updatedSaved = validSavedDecisions(
                updatedDecisionA,
                updatedDecisionB,
            );
            const updateResponse = await worker.fetch(
                new Request(`https://example.com/api/decisions/${created.id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Cookie: alice.sessionCookie,
                    },
                    body: JSON.stringify(updatedSaved),
                }),
                alice.env,
            );
            expect(updateResponse.status).toBe(200);
            expect(await updateResponse.json()).toEqual({
                id: created.id,
                title: updatedTitle,
            });

            const bobDeleteResponse = await worker.fetch(
                new Request(`https://example.com/api/decisions/${created.id}`, {
                    method: "DELETE",
                    headers: { Cookie: bob.sessionCookie },
                }),
                bob.env,
            );
            expect(bobDeleteResponse.status).toBe(404);

            const deleteResponse = await worker.fetch(
                new Request(`https://example.com/api/decisions/${created.id}`, {
                    method: "DELETE",
                    headers: { Cookie: alice.sessionCookie },
                }),
                alice.env,
            );
            expect(deleteResponse.status).toBe(200);

            const afterDelete = await worker.fetch(
                new Request(`https://example.com/api/decisions/${created.id}`, {
                    headers: { Cookie: alice.sessionCookie },
                }),
                alice.env,
            );
            expect(afterDelete.status).toBe(404);
        });

        it("deletes a user's account, sessions, and saved decisions", async () => {
            const unauthenticated = await worker.fetch(
                new Request("https://example.com/api/auth/account", {
                    method: "DELETE",
                }),
                { DB: db },
            );
            expect(unauthenticated.status).toBe(401);

            const alice = await signInTestUser({
                sub: "google-alice-delete",
                email: "alice-delete@example.com",
                name: "Alice Delete",
            });
            const bob = await signInTestUser({
                sub: "google-bob-keep",
                email: "bob-keep@example.com",
                name: "Bob Keep",
            });

            await worker.fetch(
                new Request("https://example.com/api/decisions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Cookie: alice.sessionCookie,
                    },
                    body: JSON.stringify(validSavedDecisions("Alpha", "Beta")),
                }),
                alice.env,
            );
            const bobCreate = await worker.fetch(
                new Request("https://example.com/api/decisions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Cookie: bob.sessionCookie,
                    },
                    body: JSON.stringify(validSavedDecisions("Keep A", "Keep B")),
                }),
                bob.env,
            );
            expect(bobCreate.status).toBe(201);

            const deleteResponse = await worker.fetch(
                new Request("https://example.com/api/auth/account", {
                    method: "DELETE",
                    headers: { Cookie: alice.sessionCookie },
                }),
                alice.env,
            );
            expect(deleteResponse.status).toBe(200);
            expect(await deleteResponse.json()).toEqual({ ok: true });
            expect(
                cookiePair(deleteResponse.headers.getSetCookie(), "session_token"),
            ).toBe("session_token=");

            const aliceMe = await worker.fetch(
                new Request("https://example.com/api/auth/me", {
                    headers: { Cookie: alice.sessionCookie },
                }),
                alice.env,
            );
            expect(await aliceMe.json()).toEqual({ user: null });

            const bobDecisions = await worker.fetch(
                new Request("https://example.com/api/decisions", {
                    headers: { Cookie: bob.sessionCookie },
                }),
                bob.env,
            );
            expect(bobDecisions.status).toBe(200);
            expect((await bobDecisions.json()).decisions).toHaveLength(1);
        });
    });
});
