# Handoff: Duplicate Consideration Warning (Decision-Making-App)

Last updated: 2026-11-15

## Goal

Implement [`docs/ai-duplicate-detection.md`](/home/amddesktop/Work/Decision-Making-App/docs/ai-duplicate-detection.md) in `/home/amddesktop/Work/Decision-Making-App`: warn when two or more pros (or cons) of the same decision say the same thing (e.g. "Higher salary", "More disposable income", "Better finances"). Jev (`typesafe/jev-latest` via OpenRouter) is the planned detector. The warning is non-blocking and never changes the score.

## Background

This branch started from `/home/amddesktop/Work/learning-jev/README.md` (how Jev works, its question types, project ideas). Key points for this feature:

* **Main learning goal: tuning the cutoff.** Find the `noul` / `overlap_degree` cutoff where real duplicates get flagged but related-but-different considerations (e.g. "Higher salary" vs "Better benefits") don't.
* **Jev only returns numbers, never text.** It can't return groups, so the app asks about each pair and merges duplicate pairs into groups itself.
* **One request, many questions.** A request is one `state` plus named questions, each answered separately. So one request per list can ask about every pair (`pair_0_1`, `pair_0_2`, …). Needs checking: is there a limit on question count?
* **Probabilities are meant to be calibrated** (close calls come back near 55/45, not 99/1), which is what makes picking a cutoff meaningful.
* **Cheap:** $0.042 per 1M input tokens, $0 output.
* The `choice` question (grouping by area like Financial, Commute) is optional; skip for now.

## Where we are

* **Branch:** `feature/jev-duplicate-detection`, up to date with `master` (which now has the Vitest 5 upgrade and the Docker dev setup).
* **Done:**
  * Behavior tests in `test/duplicate-warning.test.js` updated for `duplicateConsiderationDetector` terminology, the **Find duplicate considerations** button, and the privacy confirmation dialog (committed).
  * Jev learning notes (`docs/learning-jev.md`, Lessons 1–3) and batched Jev spike (`spike/try-jev.mjs`) completed.
* **Test status:** 16 tests in `test/duplicate-warning.test.js` fail as expected (button doesn't exist yet), 1 passes vacuously (`does not detect automatically before the user clicks Find duplicate considerations`). All 175 other tests pass.
* **No production code for the feature exists yet**, except the constant `DUPLICATE_WARNING_CLASS = "duplicate-warning"` in `js/constants/decision-table.js`.

## Jev spike results (2026-11-14 – 2026-11-15)

* Script: `spike/try-jev.mjs` (local only; `spike/` is in `.git/info/exclude`). Saved requests/replies are in `spike/runs/`, with the auth header masked. The script stops before printing or saving anything that contains the key.
* Verified API: `POST https://openrouter.ai/api/alpha/decisions`, `Authorization: Bearer <key>`, body `{ model, state, questions }`. Model pinned to `typesafe/jev-1.14`. Reply: `answers.<question>.score` (plus `probabilities`, `legend`, `confidence`) and `usage.cost` in USD.
* **Question type chosen: `score` (`0–2` scale) with cutoff `>= 1.5`.** Level `1` (*"Related area, but separate considerations"*) gives Jev a dedicated middle bucket so related-but-distinct pairs (e.g. "Shorter commute" / "Can bike to work") don't get forced into duplicate.
* **Batched production-shape spike (2026-11-15):** Sent 6 pros (15 pairs in 1 request, `$0.000062`) and 5 cons (10 pairs in 1 request, `$0.000046`) using neutral `"consideration"` wording and quoting both consideration strings directly in each question's `instructions`:
  * **Key finding:** Using indirect key pointers (`row_0 and row_2`) in a 6-item `state` dropped "Higher salary / Better finances" to `1.23` (missed). Quoting both consideration strings directly in each question's `instructions` restored a clean split across all 25 pairs:
    * Pros duplicates: `1.58`, `1.63`, `1.78`
    * Pros related/unrelated: `0.13–1.38` (closest: "Shorter commute / Can bike to work" at `1.38`)
    * Cons duplicates: `1.93` ("Long commute / Time spent in the car"), `1.80` ("Long hours / Working late most nights")
    * Cons related/unrelated: `0.46–1.02`
* **Ready for implementation** — no further spiking needed before wiring it up.

## Contract the tests define

* **Injection:** `initApp({ duplicateConsiderationDetector })`. Tests pass it via `loadApp({ duplicateConsiderationDetector })` in `test/loadApp.js`.
* **Detector signature:** `duplicateConsiderationDetector(considerations: string[]) => Promise<number[][]>`. Input is the non-blank considerations of **one** decision's pros or cons. Output is groups of indexes into that array that are duplicates of each other.
* **When it runs:** only when the user clicks the **Find duplicate considerations** button and confirms the privacy dialog (which informs them that consideration text is sent to an external API; confirmation is remembered for the current page session). Never runs automatically on typing, blur, or row removal. Only checks lists (that decision's pros or cons) with 2+ non-blank texts. Never across decisions, never pros against cons.
* **Warning UI:**
  * An element with class `DUPLICATE_WARNING_CLASS` inside that list's `[data-group="prosA"]` container (etc.).
  * Its text names every duplicate consideration. One warning per duplicate group.
  * It contains a `button` that dismisses it.
* **Behavior:**
  * Clears when a row is edited to something different, when a duplicate row is removed, and on Reset.
  * A dismissed warning stays hidden when other rows change and are scanned again.
  * If the detector throws: no warning, no error shown, Calculate still works.
  * Calculate is never blocked and the score is unchanged.
* **Test vocabulary:**
  * `mockDuplicateConsiderationDetector(...duplicateConsiderationFixtures)`: each fixture is a list of duplicate considerations, e.g. `HIGHER_PAY_DUPLICATES`.
  * `failingDuplicateConsiderationDetector()`.
  * `DECISION_A_PROS` etc. come from `CONSIDERATION_GROUPS`.

## Next steps

1. **Make the 17 tests in `test/duplicate-warning.test.js` pass.** Add the **Find duplicate considerations** button (in `.action-buttons`), privacy confirmation `<dialog>` (`Continue` / `Cancel`, remembered for the current page session), detector triggers, per-list warning rendering, dismiss, clear-on-edit/remove, and reset (`index.html`, `js/scripts.js`, `js/consideration-rows.js`, likely a new module for the warning). User-facing strings go in `js/constants/strings.js`. Add CSS in `css/`.
2. **Build the real Jev detector** (the only place the name "Jev" should appear). Send all pairs for one list in a single `POST https://openrouter.ai/api/alpha/decisions` (`typesafe/jev-1.14`) request using `score` (`0–2`), neutral `"consideration"` wording, and inline quoted texts in `instructions`. Flag pairs with `score >= 1.5`, then merge connected pairs into groups (`number[][]`). Test against mocked `fetch` responses in the real Jev format.
3. **Default wiring.** Production `initApp()` uses the Jev detector when `VITE_OPENROUTER_API_KEY` is set. With no key it is a no-op that makes no network calls (important because the GitHub Pages build has no key).
4. Optionally, add a Playwright e2e test that routes the OpenRouter request.

## Decided

* **Purpose of this branch (2026-11-14):** It's an experiment to learn how Jev works and what it's good for, by getting it integrated end to end. Polish comes later, only if Jev turns out to work well.
* **Privacy (2026-11-15):** Changed from automatic background checks to an explicit **Find duplicate considerations** button with a privacy confirmation dialog before sending text to an external API. Full privacy policy / settings polish is still deferred.

## Open decisions (ask the user)

* **How Claude runs tests:** Docker needs `sudo`, and Claude can't type a sudo password. The user **declined** joining the `docker` group (it's root-equivalent); never suggest it again. For now Claude runs `npx vitest run` on the host's `node_modules`, so keep host `node_modules`. Possible later option: rootless Podman (runs the same `compose.yaml` without root or sudo). The user hasn't decided on that.
* **Deploying with Jev later:** the key can't ship in a static build. If wanted, use a free proxy (e.g. Cloudflare Workers free tier).

## Environment

* Dev in Docker: `docker compose up` (serves http://localhost:5173/). Tests: `docker compose run --rm app npm test` and `docker compose run --rm app npx playwright test`. Needs `sudo` on this machine.
* Vite exposes only `VITE_`-prefixed env vars, which end up in the browser bundle. That's fine locally; never build and deploy with the key present.

## How the user wants to work

* Write behavior tests first and verify they fail, then implement.
* Code explains itself through names. Comments only for genuinely non-obvious *why*.
* Names come from the app's domain words ("consideration", "decision", "pros/cons"). No vendor names (Jev) in tests. Give one clear name recommendation; don't make the user iterate.
* Strings used in more than one place go in a constant/variable. App+test shared constants live in existing constants files; don't create a new file for one constant. One-off strings stay inline.
* Don't tell the user to run manual fix-up commands (chown, etc.). Setups must just work from a fresh clone.
* Commit only when asked. No Claude attribution in commit messages. The user does merges.
* Explain in plain terms when asked. The user reads every line of the tests.
