const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const OAUTH_STATE_COOKIE = "oauth_state";
const SESSION_COOKIE = "session_token";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) {
        return cookies;
    }
    for (const part of cookieHeader.split(";")) {
        const [rawName, ...rest] = part.trim().split("=");
        if (rawName) {
            cookies[rawName] = rest.join("=");
        }
    }
    return cookies;
}

function formatCookie(name, value, { maxAge, secure }) {
    const attributes = [
        `${name}=${value}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        `Max-Age=${maxAge}`,
    ];
    if (secure) {
        attributes.push("Secure");
    }
    return attributes.join("; ");
}

async function sha256Hex(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
    ).join("");
}

function decodeJwtPayload(jwt) {
    const parts = jwt.split(".");
    if (parts.length < 2) {
        throw new Error("Invalid JWT");
    }
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
}

export async function authenticatedUser(request, env) {
    const cookies = parseCookies(request.headers.get("Cookie"));
    const token = cookies[SESSION_COOKIE];
    if (!token || !env.DB) {
        return null;
    }
    const tokenHash = await sha256Hex(token);
    const user = await env.DB.prepare(
        `SELECT u.id, u.email, u.name
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > datetime('now')`,
    )
        .bind(tokenHash)
        .first();
    return user ?? null;
}

export function handleGoogleAuthStart(request, env) {
    const url = new URL(request.url);
    const state = crypto.randomUUID();
    const redirectUrl = new URL(GOOGLE_AUTH_URL);
    redirectUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID ?? "");
    redirectUrl.searchParams.set(
        "redirect_uri",
        `${url.origin}/api/auth/google/callback`,
    );
    redirectUrl.searchParams.set("response_type", "code");
    redirectUrl.searchParams.set("scope", "openid email");
    redirectUrl.searchParams.set("state", state);

    const headers = new Headers({ Location: redirectUrl.toString() });
    headers.append(
        "Set-Cookie",
        formatCookie(OAUTH_STATE_COOKIE, state, {
            maxAge: 600,
            secure: url.protocol === "https:",
        }),
    );
    return new Response(null, { status: 302, headers });
}

export async function handleGoogleAuthCallback(request, env, options = {}) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookies = parseCookies(request.headers.get("Cookie"));

    if (!code || !state || cookies[OAUTH_STATE_COOKIE] !== state) {
        return Response.json({ error: "Invalid OAuth state" }, { status: 400 });
    }

    const fetchFn = options.fetch ?? globalThis.fetch;
    const tokenResponse = await fetchFn(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: env.GOOGLE_CLIENT_ID ?? "",
            client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
            redirect_uri: `${url.origin}/api/auth/google/callback`,
            grant_type: "authorization_code",
        }).toString(),
    });

    if (!tokenResponse.ok) {
        return Response.json(
            { error: "OAuth token exchange failed" },
            { status: 502 },
        );
    }

    const tokenPayload = await tokenResponse.json();
    const claims = tokenPayload.id_token
        ? decodeJwtPayload(tokenPayload.id_token)
        : tokenPayload;

    if (!claims?.sub || !claims?.email) {
        return Response.json(
            { error: "Invalid Google profile" },
            { status: 502 },
        );
    }

    const userRow = await env.DB.prepare(
        `INSERT INTO users (id, google_sub, email, name)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(google_sub) DO UPDATE SET
             email = excluded.email,
             name = excluded.name
         RETURNING id, email, name`,
    )
        .bind(
            crypto.randomUUID(),
            claims.sub,
            claims.email,
            claims.name ?? null,
        )
        .first();

    const sessionToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
    const tokenHash = await sha256Hex(sessionToken);
    await env.DB.prepare(
        `INSERT INTO sessions (id, user_id, token_hash, expires_at)
         VALUES (?, ?, ?, datetime('now', '+30 days'))`,
    )
        .bind(crypto.randomUUID(), userRow.id, tokenHash)
        .run();

    const secure = url.protocol === "https:";
    const headers = new Headers({ Location: "/" });
    headers.append(
        "Set-Cookie",
        formatCookie(OAUTH_STATE_COOKIE, "", { maxAge: 0, secure }),
    );
    headers.append(
        "Set-Cookie",
        formatCookie(SESSION_COOKIE, sessionToken, {
            maxAge: SESSION_MAX_AGE_SECONDS,
            secure,
        }),
    );
    return new Response(null, { status: 302, headers });
}

export async function handleLogout(request, env) {
    const url = new URL(request.url);
    const cookies = parseCookies(request.headers.get("Cookie"));
    const token = cookies[SESSION_COOKIE];
    if (token && env.DB) {
        const tokenHash = await sha256Hex(token);
        await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
            .bind(tokenHash)
            .run();
    }
    const headers = new Headers({ "Content-Type": "application/json" });
    headers.append(
        "Set-Cookie",
        formatCookie(SESSION_COOKIE, "", {
            maxAge: 0,
            secure: url.protocol === "https:",
        }),
    );
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

export async function handleDeleteAccount(request, env) {
    const user = await authenticatedUser(request, env);
    if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await env.DB.batch([
        env.DB.prepare("DELETE FROM saved_decisions WHERE user_id = ?").bind(
            user.id,
        ),
        env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id),
        env.DB.prepare("DELETE FROM users WHERE id = ?").bind(user.id),
    ]);

    const url = new URL(request.url);
    const headers = new Headers({ "Content-Type": "application/json" });
    headers.append(
        "Set-Cookie",
        formatCookie(SESSION_COOKIE, "", {
            maxAge: 0,
            secure: url.protocol === "https:",
        }),
    );
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
