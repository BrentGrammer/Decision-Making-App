# Plan: Migrating to Cloudflare (Pages / Workers + D1 + Auth)

**Status:** planned (future).  
**Related:** [`js/saved-decisions.js`](../js/saved-decisions.js), [`js/saved-decisions-ui.js`](../js/saved-decisions-ui.js), [`js/duplicate-considerations-detector.js`](../js/duplicate-considerations-detector.js).

## Goals

1. **Per-user saved decisions in the cloud:** Let signed-in users save, list, load, update, and delete their decision comparisons in a database instead of only downloading/uploading local `.json` files.
2. **Authentication and login:** Associate saved decisions with a user account so a user can access their decisions from any device.
3. **Keep API keys off the client:** Move the OpenRouter (`typesafe/jev-1.14`) request behind a Worker endpoint so `OPENROUTER_API_KEY` is stored as a server-side Worker secret rather than bundled via `VITE_OPENROUTER_API_KEY`.
4. **Stay within Cloudflare's Free Tier:** Run the frontend, API backend, and SQLite database at $0/month on `*.workers.dev` / `*.pages.dev`.

---

## Cloudflare Free Tier Reference (Late 2026)

| Service | Free Limits | Impact on Decision-Making-App |
|---|---|---|
| **Pages / Static Assets** | Unlimited static bandwidth & requests<br>500 builds/month<br>20k files/site, 25 MiB each<br>100 projects | Serves `index.html`, `css/`, and `js/` (`dist/`) for free without touching Worker request quotas. |
| **Workers** | 100,000 requests/day<br>10 ms CPU time per request<br>100 Workers | Handles `/api/*` routes. Note: **10 ms CPU** (not wall-clock `fetch` wait time) means auth and validation must avoid CPU-heavy password hashing. |
| **D1 (SQLite)** | 5M row reads/day<br>100k row writes/day<br>5 GB total storage<br>10 databases | Stores users, sessions, and saved decisions. Keep indexes minimal because each index adds to row writes. |

---

## Target Architecture

Use a **single Cloudflare Worker with Static Assets + D1** (or Cloudflare Pages + Pages Functions) so the frontend and `/api/*` share the **same origin**:

```text
Browser (https://decision-calculator.<subdomain>.workers.dev)
  ├── Static Assets (Vite dist/) ──► index.html, css/*, js/*
  └── /api/* (Cloudflare Worker)
        ├── /api/auth/*              ──► D1 (users, sessions)
        ├── /api/decisions/*         ──► D1 (saved_decisions)
        └── /api/duplicate-check     ──► OpenRouter API (Worker secret OPENROUTER_API_KEY)
```

### Why same-origin (Single Worker + Static Assets)
- **No CORS configuration** needed between frontend and API.
- **Simple, secure auth cookies:** Session tokens can use `HttpOnly; Secure; SameSite=Lax` cookies instead of `localStorage` tokens.
- **Static requests are free:** Requests for HTML/CSS/JS are served directly by Cloudflare's asset layer and do not count against Worker CPU or request limits.

---

## Database Schema (`schema.sql`)

Reuse the existing validated payload format from [`js/saved-decisions.js`](../js/saved-decisions.js) (`model` + `decisions` array) inside a `decisions_json` column so we don't need multi-table joins on every load/save (saving D1 row reads and writes):

```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    google_sub TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saved_decisions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    model TEXT NOT NULL,
    decisions_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_saved_decisions_user_updated
    ON saved_decisions(user_id, updated_at DESC);
```

*Why store `decisions_json` as JSON instead of separate `decisions` and `considerations` tables?*
- A single decision comparison has 2 options and ~10–20 considerations. Storing the whole comparison as one row means **1 row write** on save and **1 row read** on load (well within D1's 100k writes/day and 5M reads/day).
- [`parseSavedDecisions()`](../js/saved-decisions.js) already validates the exact JSON structure and can run identically on both the client and the Worker.

---

## Authentication & Login Design: Sign in with Google Only

We will use **Sign in with Google** (Google OAuth 2.0 / OpenID Connect) as the **only** login method to start with—no email/password registration, password resets, or password hashing.

### Why Sign in with Google fits Cloudflare Free Tier best
1. **Stays well under the 10 ms Worker CPU limit:** Traditional password hashing (`bcrypt`, `argon2`, or high-iteration `PBKDF2`) routinely exceeds 10 ms CPU on free Workers. Google OAuth delegates authentication to Google; the Worker only performs an outbound `fetch` token exchange (network I/O wait time does not count against CPU time) and a `< 1 ms` SHA-256 session token hash via `crypto.subtle.digest`.
2. **Simpler schema and UI:** No password reset emails, email verification flows, or password validation forms—just a **Sign in with Google** button in `.app-bar`.

### Flow
1. `GET /api/auth/google` — generates a random CSRF `state` cookie and redirects to `https://accounts.google.com/o/oauth2/v2/auth` (`scope=openid email profile`).
2. `GET /api/auth/google/callback` — verifies the `state` cookie, exchanges `code` at `https://oauth2.googleapis.com/token` using Worker secrets `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, reads `sub` / `email` / `name`, upserts the row in `users`, inserts a hashed session token into `sessions`, and sets an `HttpOnly; Secure; SameSite=Lax` cookie.
3. `GET /api/auth/me` — returns `{ user: { id, email, name } }` or `{ user: null }`.
4. `POST /api/auth/logout` — deletes the session row in D1 and clears the cookie.

---

## API Routes (`src/worker.js`)

| Method & Path | Auth Required | Description |
|---|---|---|
| `GET /api/auth/me` | No | Returns current signed-in user or `null`. |
| `GET /api/auth/google` | No | Redirects to Google OAuth 2.0 consent screen. |
| `GET /api/auth/google/callback` | No | Completes Google login, creates D1 session, sets cookie. |
| `POST /api/auth/logout` | Yes | Deletes current session and clears cookie. |
| `GET /api/decisions` | Yes | Lists the signed-in user's saved decisions (`id`, `title`, `updated_at`). |
| `GET /api/decisions/:id` | Yes | Returns one saved decision comparison (`parseSavedDecisions` format). |
| `POST /api/decisions` | Yes | Validates body with `parseSavedDecisions()` and inserts into D1. |
| `PUT /api/decisions/:id` | Yes | Updates an existing saved decision owned by `user_id`. |
| `DELETE /api/decisions/:id` | Yes | Deletes a saved decision owned by `user_id`. |
| `POST /api/duplicate-considerations` | Yes (or rate-limited) | Calls OpenRouter using `env.OPENROUTER_API_KEY` and returns duplicate pairs `[[i, j], ...]`. |

---

## Frontend Architecture Changes

Because the codebase already separates domain logic from UI, only thin adapters are needed:

1. **Saved Decisions (`js/saved-decisions.js` & `js/saved-decisions-ui.js`):**
   - Keep `serializeSavedDecisions()` and `parseSavedDecisions()` as the shared validation/serialization layer (imported by both the frontend and the Worker).
   - Introduce a `decisionsStore` adapter injected into `initSavedDecisions({ setSelectedModel, decisionsStore })`:
     - **Signed out:** Falls back to the existing `.json` file download/upload.
     - **Signed in:** Saves to and loads from `/api/decisions`, with a dialog to pick from the user's saved decisions list.
2. **Duplicate Considerations Detector (`js/duplicate-considerations-detector.js`):**
   - Replace the direct browser call to OpenRouter with a provider that `POST`s `{ considerations }` to `/api/duplicate-considerations`, or keep `jev-duplicate-detector.js` running inside the Worker where `env.OPENROUTER_API_KEY` is secret.
   - `js/duplicate-considerations-detector-ui.js` and `js/ duplicate-considerations-detector.js` (`mergeConnectedPairs`) remain unchanged.

---

## Step-by-Step Migration Playbook

### Phase 1: Cloudflare & Wrangler Setup
1. Create a free Cloudflare account at [dash.cloudflare.com](https://dash.cloudflare.com) and set your `*.workers.dev` subdomain under **Workers & Pages**.
2. Install Wrangler as a dev dependency (and inside the Docker dev image):
   ```bash
   npm install --save-dev wrangler
   npx wrangler login
   ```
3. Create the D1 database:
   ```bash
   npx wrangler d1 create decision-making-app-db
   ```
4. Add `wrangler.toml` at the repository root:
   ```toml
   name = "decision-making-app"
   main = "src/worker.js"
   compatibility_date = "2026-11-01"

   [assets]
   directory = "./dist"
   not_found_handling = "single-page-application"

   [[d1_databases]]
   binding = "DB"
   database_name = "decision-making-app-db"
   database_id = "<database-id-from-step-3>"
   ```

### Phase 2: Local D1 Schema & Worker Skeleton
1. Save the SQL schema to `schema.sql` and apply it locally:
   ```bash
   npx wrangler d1 execute decision-making-app-db --local --file=./schema.sql
   ```
2. Create `src/worker.js` handling `/api/*` routes and delegating all other requests to `env.ASSETS.fetch(request)`.
3. Run locally with `npx wrangler dev` (which emulates D1 in `.wrangler/state` and serves the Vite build).

### Phase 3: Move Duplicate Detection Key to Worker Secret
1. Store the OpenRouter key in `.dev.vars` locally (gitignored) and as a Cloudflare secret in production:
   ```bash
   npx wrangler secret put OPENROUTER_API_KEY
   ```
2. Expose `POST /api/duplicate-considerations` on the Worker using [`js/jev-duplicate-detector.js`](../js/jev-duplicate-detector.js) with `apiKey: env.OPENROUTER_API_KEY`.
3. Remove `VITE_OPENROUTER_API_KEY` from the browser bundle.

### Phase 4: Sign in with Google + Per-User Saved Decisions
1. Create an OAuth 2.0 Client ID in Google Cloud Console (authorized redirect URI: `https://<worker-url>/api/auth/google/callback` and `http://localhost:8787/api/auth/google/callback` for `wrangler dev`) and store `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` via `npx wrangler secret put`.
2. Implement `/api/auth/*` and `/api/decisions/*` against `env.DB` with unit tests using mocked/local D1.
3. Add a **Sign in with Google** / **Sign out** control in `.app-bar` and wire `initSavedDecisions()` to the cloud store when signed in.
4. Apply the schema to the remote D1 database and deploy:
   ```bash
   npx wrangler d1 execute decision-making-app-db --remote --file=./schema.sql
   npm run build
   npx wrangler deploy
   ```
