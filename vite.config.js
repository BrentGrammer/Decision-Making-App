import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import worker from "./worker/worker.js";

async function createLocalPlatform() {
  const { getPlatformProxy } = await import("wrangler");
  const platform = await getPlatformProxy();
  const sql = readFileSync("./schema.sql", "utf8");
  const statements = sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((statement) => platform.env.DB.prepare(statement));
  await platform.env.DB.batch(statements);
  return platform;
}

function cloudflareWorkerApiPlugin() {
  let platformPromise;
  return {
    name: "cloudflare-worker-api",
    configureServer(server) {
      platformPromise = createLocalPlatform();
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) {
          next();
          return;
        }
        const platform = await platformPromise;
        let body;
        if (req.method !== "GET" && req.method !== "HEAD") {
          const chunks = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }
          body = Buffer.concat(chunks);
        }
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
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        privacy: "privacy.html",
      },
    },
  },
});
