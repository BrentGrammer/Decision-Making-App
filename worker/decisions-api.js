import { parseSavedDecisions } from "../js/saved-decisions.js";
import { authenticatedUser } from "./auth.js";

function decisionComparisonTitle(saved) {
    const first = saved.decisions[0]?.name?.trim() || "Decision A";
    const second = saved.decisions[1]?.name?.trim() || "Decision B";
    return `${first} vs. ${second}`;
}

async function parseValidatedDecisionBody(request) {
    const raw = await request.text();
    const saved = parseSavedDecisions(raw);
    const title = decisionComparisonTitle(saved);
    return { saved, title, decisionsJson: JSON.stringify(saved) };
}

export async function handleDecisionsRoutes(request, env, pathname) {
    const user = await authenticatedUser(request, env);
    if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (pathname === "/api/decisions" && request.method === "GET") {
        const { results } = await env.DB.prepare(
            `SELECT id, title, updated_at
             FROM saved_decisions
             WHERE user_id = ?
             ORDER BY updated_at DESC`,
        )
            .bind(user.id)
            .all();
        return Response.json({ decisions: results });
    }

    if (pathname === "/api/decisions" && request.method === "POST") {
        let parsed;
        try {
            parsed = await parseValidatedDecisionBody(request);
        } catch {
            return Response.json(
                { error: "Invalid saved decisions payload" },
                { status: 400 },
            );
        }
        const id = crypto.randomUUID();
        await env.DB.prepare(
            `INSERT INTO saved_decisions (id, user_id, title, model, decisions_json)
             VALUES (?, ?, ?, ?, ?)`,
        )
            .bind(
                id,
                user.id,
                parsed.title,
                parsed.saved.model,
                parsed.decisionsJson,
            )
            .run();
        return Response.json({ id, title: parsed.title }, { status: 201 });
    }

    const itemMatch = pathname.match(/^\/api\/decisions\/([^/]+)$/);
    if (!itemMatch) {
        return Response.json({ error: "Not found" }, { status: 404 });
    }
    const decisionId = decodeURIComponent(itemMatch[1]);

    if (request.method === "GET") {
        const row = await env.DB.prepare(
            `SELECT id, title, decisions_json
             FROM saved_decisions
             WHERE id = ? AND user_id = ?`,
        )
            .bind(decisionId, user.id)
            .first();
        if (!row) {
            return Response.json({ error: "Not found" }, { status: 404 });
        }
        const saved = parseSavedDecisions(row.decisions_json);
        return Response.json({ id: row.id, title: row.title, ...saved });
    }

    if (request.method === "PUT") {
        let parsed;
        try {
            parsed = await parseValidatedDecisionBody(request);
        } catch {
            return Response.json(
                { error: "Invalid saved decisions payload" },
                { status: 400 },
            );
        }
        const result = await env.DB.prepare(
            `UPDATE saved_decisions
             SET title = ?, model = ?, decisions_json = ?, updated_at = datetime('now')
             WHERE id = ? AND user_id = ?`,
        )
            .bind(
                parsed.title,
                parsed.saved.model,
                parsed.decisionsJson,
                decisionId,
                user.id,
            )
            .run();
        if (!result.meta?.changes) {
            return Response.json({ error: "Not found" }, { status: 404 });
        }
        return Response.json({ id: decisionId, title: parsed.title });
    }

    if (request.method === "DELETE") {
        const result = await env.DB.prepare(
            `DELETE FROM saved_decisions WHERE id = ? AND user_id = ?`,
        )
            .bind(decisionId, user.id)
            .run();
        if (!result.meta?.changes) {
            return Response.json({ error: "Not found" }, { status: 404 });
        }
        return Response.json({ deleted: true });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
}
