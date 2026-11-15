import {
    authenticatedUser,
    handleGoogleAuthCallback,
    handleGoogleAuthStart,
    handleLogout,
} from "./auth.js";
import { handleDecisionsRoutes } from "./decisions-api.js";
import { handleDuplicateConsiderations } from "./duplicate-considerations-api.js";

export default {
    async fetch(request, env, options) {
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
    },
};
