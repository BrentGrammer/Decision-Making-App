import { defineConfig } from "vite";
import worker from "./src/worker.js";

function cloudflareWorkerApiPlugin() {
  let platformPromise;
  return {
    name: "cloudflare-worker-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) {
          next();
          return;
        }
        platformPromise ??= import("wrangler").then(({ getPlatformProxy }) =>
          getPlatformProxy(),
        );
        const platform = await platformPromise;
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const body =
          req.method === "GET" || req.method === "HEAD"
            ? undefined
            : Buffer.concat(chunks);
        const url = new URL(
          req.url,
          `http://${req.headers.host || "localhost:5173"}`,
        );
        const request = new Request(url, {
          method: req.method,
          headers: req.headers,
          body,
        });
        const response = await worker.fetch(request, platform.env);
        res.statusCode = response.status;
        for (const [key, value] of response.headers.entries()) {
          res.setHeader(key, value);
        }
        const setCookies = response.headers.getSetCookie?.() ?? [];
        if (setCookies.length > 0) {
          res.setHeader("set-cookie", setCookies);
        }
        res.end(Buffer.from(await response.arrayBuffer()));
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [cloudflareWorkerApiPlugin()],
});
