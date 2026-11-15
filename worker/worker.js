import {
    authenticatedUser,
    handleGoogleAuthCallback,
    handleGoogleAuthStart,
    handleLogout,
} from "./auth.js";
import { handleDecisionsRoutes } from "./decisions-api.js";
import { handleDuplicateConsiderations } from "./duplicate-considerations-api.js";

export const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
].join("; ");

function withSecurityHeaders(response) {
    const headers = new Headers(response.headers);
    headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

async function routeRequest(request, env, options) {
    const { pathname } = new URL(request.url);

    if (
        request.method === "POST" &&
        pathname === "/api/duplicate-considerations"
    ) {
        return handleDuplicateConsiderations(request, env, options);
    }

    if (request.method === "GET" && pathname === "/api/auth/me") {
        const user = await authenticatedUser(request, env);
        return Response.json({ user });
    }

    if (request.method === "GET" && pathname === "/api/auth/google") {
        return handleGoogleAuthStart(request, env);
    }

    if (
        request.method === "GET" &&
        pathname === "/api/auth/google/callback"
    ) {
        return handleGoogleAuthCallback(request, env, options);
    }

    if (request.method === "POST" && pathname === "/api/auth/logout") {
        return handleLogout(request, env);
    }

    if (
        pathname === "/api/decisions" ||
        pathname.startsWith("/api/decisions/")
    ) {
        return handleDecisionsRoutes(request, env, pathname);
    }

    if (pathname.startsWith("/api/")) {
        return Response.json({ error: "Not found" }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
}

export default {
    async fetch(request, env, options) {
        const response = await routeRequest(request, env, options);
        return withSecurityHeaders(response);
    },
};
