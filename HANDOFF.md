# Handoff: Duplicate Consideration Warning (Decision-Making-App)

Last updated: 2026-11-14

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
* **Done:** Behavior tests written first and confirmed failing: `test/duplicate-warning.test.js`, committed as WIP (`788790a`).
* **Test status:** 13 new tests fail with assertion errors (warning never appears / detector never called), as expected. 1 passes vacuously (`does not detect until two pros or cons of the same decision have text`). All 175 other tests pass.
* **No production code for the feature exists yet**, except the constant `DUPLICATE_WARNING_CLASS = "duplicate-warning"` in `js/constants/decision-table.js`.

## Jev spike results (2026-11-14)

* Script: `spike/try-jev.mjs` (local only; `spike/` is in `.git/info/exclude`). Saved requests/replies are in `spike/runs/`, with the auth header masked. The script stops before printing or saving anything that contains the key.
* Verified API: `POST https://openrouter.ai/api/alpha/decisions`, `Authorization: Bearer <key>`, body `{ model, state, questions }`. Model pinned to `typesafe/jev-1.14`. Reply: `answers.<question>.noul` (0–1), `answers.<question>.score` plus `probabilities`, `legend` and `confidence`, and `usage.cost` in USD. It does return output tokens (~36), but they're free.
* One request per pair, 11 labelled pairs, about $0.0002 total. Clean split:
  * same: noul 0.70–0.95, overlap 1.65–2.00
  * related but different: noul 0.03–0.34, overlap 0.72–1.12
  * unrelated: noul 0.03, overlap ~0.23
  * Closest call: "Shorter commute / Can bike to work" (0.34 / 1.12).
* Cutoffs that work on this sample: noul ≥ 0.5 or overlap ≥ 1.5.
* Not tried yet: all pairs in one request, harder or ambiguous pairs, cons.

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

1. **Make the 13 tests pass.** Wire the detector, triggers, warning rendering, dismiss, and reset into the app (`js/scripts.js`, `js/consideration-rows.js`, likely a new module for the warning). User-facing warning text goes in `js/constants/strings.js`. Add CSS in `css/`.
2. **Spike the real Jev call.** Find the real full URL and request/response shape for `POST /api/alpha/decisions` on OpenRouter (README shapes and path are **unverified**). Send labelled sample pairs (clear duplicates, related-but-different, unrelated) and look at their `noul` and `overlap_degree` to see where a cutoff falls. Keep the spike out of the app code and uncommitted. The key is in `.env` as `VITE_OPENROUTER_API_KEY` (template: `.env.template`). Never read or print the key value.
3. **Build the real Jev detector** (the only place the name "Jev" should appear). Compare pairs within one list with `noul` (`is_duplicate`) and/or `score` (`overlap_degree`, 0 distinct / 1 related but separate / 2 same benefit), then merge pairs into groups. Test it against mocked `fetch` responses in the real Jev format. Tune thresholds (starting guess: `overlap_degree ≥ 1.5`).
4. **Default wiring.** Production `initApp()` uses the Jev detector when the key is set. With no key it is a no-op that makes no network calls. This matters because the GitHub Pages build has no key.
5. Optionally, add a Playwright e2e test that routes the OpenRouter request.

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
