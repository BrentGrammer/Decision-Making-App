# Handoff: Cloudflare Migration & Duplicate Considerations Detector (Decision-Making-App)

Last updated: 2026-11-15

## Goal

1. Implement [`docs/ai-duplicate-detection.md`](/home/amddesktop/Work/Decision-Making-App/docs/ai-duplicate-detection.md) in `/home/amddesktop/Work/Decision-Making-App`: warn when two or more pros (or cons) of the same decision say the same thing, with an option to remove duplicates or dismiss the warning.
2. Implement [`docs/cloudflare-migration-plan.md`](/home/amddesktop/Work/Decision-Making-App/docs/cloudflare-migration-plan.md): migrate to Cloudflare Workers + Static Assets + D1 SQLite + **Sign in with Google** (as the sole auth method) + server-side `OPENROUTER_API_KEY`.

## Where we are

* **Branch:** `feature/cloudflare` (branched with `feature/jev-duplicate-detection` merged in).
* **Status:** **Phases 1–4 of the Cloudflare migration, account menu/deletion, privacy page, and test wrappers are implemented and unit/integration-tested locally.**
  * **Vitest:** 222 passed across 13 test files (`npx vitest run`), including:
    * 15 Worker + real local D1 SQLite tests in [`test/worker.test.js`](/home/amddesktop/Work/Decision-Making-App/test/worker.test.js) covering `/api/duplicate-considerations`, `/api/auth/*` (including `DELETE /api/auth/account` with best-effort Google token revocation), and `/api/decisions/*`.
    * 9 UI behavior tests in [`test/saved-decisions-ui.test.js`](/home/amddesktop/Work/Decision-Making-App/test/saved-decisions-ui.test.js) covering signed-out file fallback, `.app-bar` Sign in with Google, account menu dropdown (**Sign out** / **Delete account**), and signed-in cloud save/load/delete dialog.
    * 15 unit tests in [`test/saved-decisions.test.js`](/home/amddesktop/Work/Decision-Making-App/test/saved-decisions.test.js) covering serialization, validation, and `createCloudDecisionsStore` (including `deleteAccount`).
    * 20 UI behavior tests in [`test/duplicate-considerations-detector-ui.test.js`](/home/amddesktop/Work/Decision-Making-App/test/duplicate-considerations-detector-ui.test.js) and 4 detector unit tests in [`test/duplicate-considerations-detector.test.js`](/home/amddesktop/Work/Decision-Making-App/test/duplicate-considerations-detector.test.js).
  * **Playwright e2e:** 21 passed (`sudo ./run-e2e.sh`).
  * **Build & scripts:** `npm run build` outputs `dist/index.html`, `dist/privacy.html`, and `dist/favicon.svg` cleanly. Added [`run-tests.sh`](/home/amddesktop/Work/Decision-Making-App/run-tests.sh) and [`run-e2e.sh`](/home/amddesktop/Work/Decision-Making-App/run-e2e.sh) (without `sudo`) and updated [`README.md`](/home/amddesktop/Work/Decision-Making-App/README.md).
* **Next steps:**
  1. *(Optional)* Add a Playwright e2e test for signed-in cloud save/load.
  2. Provision remote Cloudflare D1 & Google OAuth credentials (including production redirect URI and `https://<domain>/privacy.html` when publishing OAuth beyond Testing mode) and deploy (`npx wrangler login`, `npx wrangler d1 create decision-making-app-db`, update `database_id` in `wrangler.toml`, `npm run db:migrate:remote`, set Worker secrets `OPENROUTER_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and run `npm run deploy`).

## Architecture & directory layout

* **`wrangler.toml` & `schema.sql`:**
  * [`wrangler.toml`](/home/amddesktop/Work/Decision-Making-App/wrangler.toml) declares the Cloudflare Worker (`worker/worker.js`), Static Assets (`./dist` via `env.ASSETS` with `run_worker_first = ["/api/*"]`), and D1 database (`decision-making-app-db` via `env.DB`).
  * [`schema.sql`](/home/amddesktop/Work/Decision-Making-App/schema.sql) defines idempotent D1 tables (`users`, `sessions`, `saved_decisions`) and index (`idx_saved_decisions_user_updated`).
* **`worker/` (Cloudflare Worker backend — server-only):**
  * **[`worker/worker.js`](/home/amddesktop/Work/Decision-Making-App/worker/worker.js):** Thin request router dispatching `/api/*` routes and delegating static requests to `env.ASSETS.fetch(request)`.
  * **[`worker/auth.js`](/home/amddesktop/Work/Decision-Making-App/worker/auth.js):** Google OAuth 2.0 flow (`GET /api/auth/google` with `openid email` scope and `prompt=select_account`, `GET /api/auth/google/callback`), SHA-256 hashed session token lookup (`GET /api/auth/me`, `authenticatedUser`), `POST /api/auth/logout`, and `DELETE /api/auth/account` (deletes user data + best-effort Google token revocation).
  * **[`worker/decisions-api.js`](/home/amddesktop/Work/Decision-Making-App/worker/decisions-api.js):** Per-user CRUD routes (`GET /api/decisions`, `POST /api/decisions`, `GET /api/decisions/:id`, `PUT /api/decisions/:id`, `DELETE /api/decisions/:id`) validated with `parseSavedDecisions()`.
  * **[`worker/duplicate-considerations-api.js`](/home/amddesktop/Work/Decision-Making-App/worker/duplicate-considerations-api.js):** Handles `POST /api/duplicate-considerations` using `env.OPENROUTER_API_KEY`.
  * **[`worker/jev-duplicate-detector.js`](/home/amddesktop/Work/Decision-Making-App/worker/jev-duplicate-detector.js):** Jev provider adapter (`createJevDuplicatePairsDetector`) — the only file that knows about Jev (`typesafe/jev-1.14`) or OpenRouter (`POST https://openrouter.ai/api/alpha/decisions`, `score` `0–2` with cutoff `>= 1.5`).
* **`js/` (Browser frontend):**
  * **[`js/duplicate-considerations-detector.js`](/home/amddesktop/Work/Decision-Making-App/js/duplicate-considerations-detector.js):** Provider-agnostic domain module (`createDuplicateConsiderationsDetector`). Defaults to posting `{ considerations }` to `POST /api/duplicate-considerations` and merging connected `duplicatePairs` into sorted index groups `number[][]`.
  * **[`js/duplicate-considerations-detector-ui.js`](/home/amddesktop/Work/Decision-Making-App/js/duplicate-considerations-detector-ui.js)** & **[`css/duplicate-considerations-detector-ui.css`](/home/amddesktop/Work/Decision-Making-App/css/duplicate-considerations-detector-ui.css):** Wires `#detect-duplicates`, validation/privacy dialogs, `.duplicate-warning` banners, **Remove duplicates** (`removeDuplicateConsiderations`), and **Dismiss**.
  * **[`js/saved-decisions.js`](/home/amddesktop/Work/Decision-Making-App/js/saved-decisions.js)** & **[`js/saved-decisions-ui.js`](/home/amddesktop/Work/Decision-Making-App/js/saved-decisions-ui.js):**
    * Shared `serializeSavedDecisions()` and `parseSavedDecisions()` plus `createCloudDecisionsStore()`.
    * Renders **Sign in with Google** (`#sign-in-google`) when signed out, or an `#account-menu` dropdown (generic avatar + `#signed-in-user` + **Sign out** + **Delete account**) when signed in.
    * **Signed out:** **Save** and **Load** use local `.json` file download/upload.
    * **Signed in:** **Save** creates/updates in `/api/decisions`; **Load** opens `#saved-decisions-dialog` to load or delete saved comparisons.
  * **[`js/constants/selectors.js`](/home/amddesktop/Work/Decision-Making-App/js/constants/selectors.js):** Frozen `ELEMENT_IDS`, `CLASS_NAMES`, and `SELECTORS` dictionaries (used by `js/scripts.js`, `js/saved-decisions-ui.js`, and `test/saved-decisions-ui.test.js`).
  * **[`privacy.html`](/home/amddesktop/Work/Decision-Making-App/privacy.html)** & **[`public/favicon.svg`](/home/amddesktop/Work/Decision-Making-App/public/favicon.svg):** Privacy policy page (linked from `index.html` footer) and tilted balance-scale SVG favicon.
* **[`vite.config.js`](/home/amddesktop/Work/Decision-Making-App/vite.config.js):** Includes a dev-server middleware backed by Wrangler's `getPlatformProxy()` so `npm run serve` (and Playwright e2e) routes `/api/*` requests through `worker/worker.js` with local D1 and `.env` secrets, and builds both `index.html` and `privacy.html`.

## Jev spike findings (2026-11-14 – 2026-11-15)

* Script: `spike/try-jev.mjs` (local only; `spike/` is in `.git/info/exclude`).
* **Question type & cutoff:** `score` (`0–2` scale) with cutoff `>= 1.5`.
* **Prompt sensitivity:**
  * Quoting both consideration strings directly in each question's `instructions` (rather than indirect `row_0`/`row_2` pointers) is required for a clean split on 6-item lists.
  * Proven 3rd criterion wording: `"Same underlying consideration worded differently (counting both double-counts it)"`.

## Terminology & conventions (strictly enforced)

* **Domain terms:** Use **detect** (never "find" or "evaluate"), **considerations** plural for the detector (`duplicateConsiderationsDetector`, `createDuplicateConsiderationsDetector`, `initDuplicateConsiderationsDetector`), and **consideration / considerations** (never "row / rows") in duplicate-detection functions and test descriptions.
* **Remove action:** Called **Remove duplicates** (`DUPLICATE_WARNING_REMOVE`, `removeDuplicateConsiderations`), not "consolidate".
* **No vendor names (Jev / OpenRouter) in tests or UI:** Even the Playwright e2e test in `e2e/decision.spec.js` drives only the public UI without intercepting or referencing OpenRouter URLs.
* **No hardcoded UI strings in tests:** Tests import shared label/message constants from `js/constants/strings.js` (`DETECT_DUPLICATES_LABEL`, `DUPLICATE_PRIVACY_CONTINUE`, `DUPLICATE_PRIVACY_CANCEL`, `DUPLICATE_WARNING_REMOVE`, `DUPLICATE_WARNING_DISMISS`, `SIGN_IN_WITH_GOOGLE_LABEL`, `SIGN_OUT_LABEL`, etc.).

## Environment & how the user wants to work

* **Running tests:** Docker needs `sudo` (`docker compose run --rm app npm test` / `npx playwright test`). Never suggest adding the user to the `docker` group. Run `npx vitest run` against host `node_modules`.
* **TDD:** Write behavior tests first and verify they fail, then implement.
* **Code style:** Code explains itself through names. Comments only when requested or for genuinely non-obvious *why*.
* **Git:** Commit only when asked. No AI attribution in commit messages. The user does merges.
