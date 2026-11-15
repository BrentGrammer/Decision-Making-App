# Handoff: Duplicate Considerations Detector (Decision-Making-App)

Last updated: 2026-11-15

## Goal

Implement [`docs/ai-duplicate-detection.md`](/home/amddesktop/Work/Decision-Making-App/docs/ai-duplicate-detection.md) in `/home/amddesktop/Work/Decision-Making-App`: warn when two or more pros (or cons) of the same decision say the same thing (e.g. "Higher salary", "More disposable income", "Better finances"), with an option to remove duplicates or dismiss the warning.

## Where we are

* **Branch:** `feature/jev-duplicate-detection`
* **Status:** **Feature complete and tested end-to-end.**
  * **Vitest:** 200 passed across 12 test files (`npx vitest run`), including 20 UI behavior tests in [`test/duplicate-considerations-detector-ui.test.js`](/home/amddesktop/Work/Decision-Making-App/test/duplicate-considerations-detector-ui.test.js) and 6 detector unit tests in [`test/duplicate-considerations-detector.test.js`](/home/amddesktop/Work/Decision-Making-App/test/duplicate-considerations-detector.test.js).
  * **Playwright e2e:** `detects and removes duplicate considerations` added to [`e2e/decision.spec.js`](/home/amddesktop/Work/Decision-Making-App/e2e/decision.spec.js) and verified passing against the live app.
  * **Future architecture plan:** [`docs/cloudflare-migration-plan.md`](/home/amddesktop/Work/Decision-Making-App/docs/cloudflare-migration-plan.md) documents the planned migration to Cloudflare Workers + Static Assets + D1 SQLite + **Sign in with Google** (as the sole auth method) + server-side `OPENROUTER_API_KEY`.

## Architecture & files

* **[`js/duplicate-considerations-detector.js`](/home/amddesktop/Work/Decision-Making-App/js/duplicate-considerations-detector.js):** Provider-agnostic domain module (`createDuplicateConsiderationsDetector`). Owns the `< 2` guard and `mergeConnectedPairs()` (merging connected duplicate pairs into sorted index groups `number[][]`), delegating pairwise detection to a swappable `detectDuplicatePairs` provider.
* **[`js/jev-duplicate-detector.js`](/home/amddesktop/Work/Decision-Making-App/js/jev-duplicate-detector.js):** Jev provider adapter (`createJevDuplicatePairsDetector`) — the only file in `js/` that knows about Jev or OpenRouter. Sends all pairs for one list in a single `POST https://openrouter.ai/api/alpha/decisions` (`typesafe/jev-1.14`) request using `score` (`0–2`) and flags pairs with `score >= 1.5`. Defaults `apiKey` to `import.meta.env?.VITE_OPENROUTER_API_KEY` (returns `[]` with zero network calls when unset).
* **[`js/duplicate-considerations-detector-ui.js`](/home/amddesktop/Work/Decision-Making-App/js/duplicate-considerations-detector-ui.js)** & **[`css/duplicate-considerations-detector-ui.css`](/home/amddesktop/Work/Decision-Making-App/css/duplicate-considerations-detector-ui.css):**
  * Wires `#detect-duplicates` (**Detect duplicate considerations**) in `.action-buttons`.
  * Opens `#validation-dialog` (`DUPLICATE_NEEDS_PAIR_VALIDATION_ERROR`) if no pro/con list has at least 2 non-blank considerations.
  * Opens `#duplicate-privacy-dialog` (`Continue` / `Cancel`, remembered for the current page session) before sending consideration text to the external API.
  * Renders one `.duplicate-warning` banner per duplicate group inside `[data-group="..."] .duplicate-warnings`, naming every duplicate consideration in the group.
  * Each warning has two buttons:
    * **Remove duplicates** (`DUPLICATE_WARNING_REMOVE`) — calls `removeDuplicateConsiderations(groupId, considerations)` in [`js/consideration-rows.js`](/home/amddesktop/Work/Decision-Making-App/js/consideration-rows.js), keeping the consideration with the highest 0–10 slider rating (or the first consideration on a tie) and removing the others.
    * **Dismiss** (`DUPLICATE_WARNING_DISMISS`) — hides the warning and remembers the dismissed group across rescans until reset.
  * Automatically prunes warnings when a consideration in that group is edited or removed, and clears all warnings on **Reset**.

## Jev spike findings (2026-11-14 – 2026-11-15)

* Script: `spike/try-jev.mjs` (local only; `spike/` is in `.git/info/exclude`).
* **Question type & cutoff:** `score` (`0–2` scale) with cutoff `>= 1.5`.
* **Prompt sensitivity:**
  * Quoting both consideration strings directly in each question's `instructions` (rather than indirect `row_0`/`row_2` pointers) is required for a clean split on 6-item lists.
  * Tested 4 alternative wordings for the 3rd criterion (`"Same consideration worded differently"`, `"Direct restatement of the same consideration"`, `"Counting both double-counts the same consideration"`, `"Same consideration worded differently, so counting both double-counts it"`). None separated as cleanly at `1.5` as the proven wording: `"Same underlying consideration worded differently (counting both double-counts it)"`. Kept the proven wording.

## Terminology & conventions (strictly enforced)

* **Domain terms:** Use **detect** (never "find" or "evaluate"), **considerations** plural for the detector (`duplicateConsiderationsDetector`, `createDuplicateConsiderationsDetector`, `initDuplicateConsiderationsDetector`), and **consideration / considerations** (never "row / rows") in duplicate-detection functions and test descriptions.
* **Remove action:** Called **Remove duplicates** (`DUPLICATE_WARNING_REMOVE`, `removeDuplicateConsiderations`), not "consolidate".
* **No vendor names (Jev / OpenRouter) in tests or UI:** Even the Playwright e2e test in `e2e/decision.spec.js` drives only the public UI without intercepting or referencing OpenRouter URLs.
* **No hardcoded UI strings in tests:** Tests import shared label/message constants from `js/constants/strings.js` (`DETECT_DUPLICATES_LABEL`, `DUPLICATE_PRIVACY_CONTINUE`, `DUPLICATE_PRIVACY_CANCEL`, `DUPLICATE_WARNING_REMOVE`, `DUPLICATE_WARNING_DISMISS`, etc.).

## Environment & how the user wants to work

* **Running tests:** Docker needs `sudo` (`docker compose run --rm app npm test` / `npx playwright test`). Never suggest adding the user to the `docker` group. Run `npx vitest run` against host `node_modules`.
* **TDD:** Write behavior tests first and verify they fail, then implement.
* **Code style:** Code explains itself through names. Comments only when requested or for genuinely non-obvious *why*.
* **Git:** Commit only when asked. No AI attribution in commit messages. The user does merges.
