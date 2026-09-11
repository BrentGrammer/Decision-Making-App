# Decision Making App — Code Review

## Handoff (for the next session)

**When:** 11 September 2026, after selectable scoring models, the normalized margin, the contributors table, and the Dealbreaker veto. (Previous handoff: 8 September 2026 — in-page names, add/remove independent pro and con rows, blank-row slider warnings, `consideration-rows.js` extraction, scoring/UI-string split, Vite serve, Playwright tests.)
**Start here.** The review notes below are kept for the diagnosis of *why* the old percent formula was wrong. Every sentence in them that described current behavior has been brought up to the code as of this handoff; items already shipped are struck through or marked Done. Where a note and the code ever disagree, the code wins.

### Where the project is

Category **1 (critical bugs / invalid math)** is done. In-page decision names (no START / `prompt()`) are done. Independent add/remove pro and con rows with inline blank-text warnings are done.

The app is still a **static page**. `index.html` stays at the repo root (GitHub Pages + Vite serve). App modules live under `js/`. No `src/`, no app bundler. Vite is **dev server only** (`npm run serve`). Open via that server (or GitHub Pages), not `file://`.

```text
index.html
main.css
js/
  scripts.js              Orchestration, initApp, decision name validation, calculate/reset
  consideration-rows.js   Row templates, add/remove, slider sync, blank-row warning
  scoring.js              DOM-free: weights, name rules, comparison outcome
  constants/strings.js   UI sentences + formatComparison(outcome)
test/                     Vitest + jsdom
e2e/                      Playwright (Chromium)
docs/                     future-feature notes
```

Scoring returns a **structured outcome** (`KIND.tie` | `lead` | `disqualified`). `formatComparison` in `js/constants/strings.js` turns that into an **array of result blocks**, each tagged with a `RESULT_BLOCK` kind: `line` carries `text`, `contributors` carries `groups`. `js/scripts.js` renders `line` as `<p class="result-line">` and `contributors` as `<table class="contributors">` inside `#finalResult`. Adding a third kind of block means a new `RESULT_BLOCK` entry and a branch in `resultBlock`, not a rewritten sentence. Length limits (`DECISION_NAME_MIN_LENGTH` / `MAX`) stay in `scoring.js`. Tests import UI strings from `constants/strings.js` — do not hardcode those sentences in tests.

Scoring math. Every filled rating passes through the selected model's transform `w(r)` before it is summed:

```text
score      = sum(w(filled pro ratings)) − sum(w(filled con ratings))
difference = scoreA − scoreB
margin     = |difference| / sum(w(every filled rating, both options))
```

The `MODELS` registry in `scoring.js` holds each model's `id`, `transform`, and (Dealbreaker only) `veto: true`. `resolveModel` falls back to `DEFAULT_MODEL_ID` (Squared) for an unknown or missing id. The dropdown holds its choice in memory only, and a model change applies on the next Calculate.

A `lead` outcome carries `points`, `marginPercent`, and `contributors: { toward, against }` — up to three rows a side, each `{ text, rating, option, type, share }`, carrying the user's own 0–10 rating, whether the row is a `CONSIDERATION_TYPE.pro` or `.con`, and its share of all points entered. Every transform is monotone, so the list keeps the same order under every model; switching models changes which decision wins, moving rows between `toward` and `against`, and changes each row's `share`. `share` is the row's transformed weight over `weightEntered` — the same denominator as `marginPercent`, so "of all points entered" means one thing everywhere.

The contributors table is captioned `CONTRIBUTORS_CAPTION` ("Top contributors") with an `.hint` info button beside it carrying `CONTRIBUTORS_HINT` — the same markup as the column-header tips, built in JS and reusing the `#icon-info` sprite in `index.html`. It shows the rows grouped by the decision they favour, headed `In favor of {decision}` (`inFavorOf` in `constants/strings.js`) — the winner's group first, the loser's group only when something favours it. A row favours a decision by being one of its pros or one of the other option's cons, so each row prints five cells: the decision it was typed under, `pro`/`con`, the text, the rating, and the row's share of all points entered as a plain percent (`sharePercent`). The share says how much of the verdict rests on that one consideration. It was added to make the model dropdown observable and **does not succeed at that** — see the loose end in `docs/model-refinement.md`; keep it for the fragility reading, not as a model demo. The column headers are in a `<thead class="contributor-columns">` that CSS hides visually, so the table reads as the sketch while screen readers still get column names. Ties and Dealbreaker vetoes are a single line with no table.

Dealbreaker short-circuits before any of that: a filled con rated 10 disqualifies its option and returns `disqualified`, carrying only the winner, the loser, and the cons that ruled it out. Both options vetoed, or neither, falls through to the ordinary comparison. Only cons can veto. The concern column's hint (`#concern-hint`) swaps wording whenever the selected model carries the `veto` flag.

`marginPercent` reports the lead as a share of every point entered — a measure of decisiveness chosen by the app. Keep the result copy describing it that way; reporting it as a percent one decision beats another is the bug this review was written about. See [`docs/model-refinement.md`](docs/model-refinement.md) for the full plan and decisions log.

A row counts only if the adjacent text is non-blank. Empty sliders default to `0`. If a slider is moved (> 0) while text remains blank, inline field validation warns that text is required or the row should be removed (`aria-invalid="true"` and an adjacent `.field-error`). Calculate now **refuses to run** on a decision table it cannot score, clearing `#finalResult` and opening the `#validation-dialog` `<dialog>` instead. `decisionTableValidationErrors()` collects every reason, in page order, and the dialog shows one `<p class="validation-error">` per reason: a missing or over-long decision name (`DECISION_NAME_VALIDATION_ERROR` / `DECISION_NAME_LENGTH_VALIDATION_ERROR`), rows that carry a rating with no text (`CONSIDERATION_ROW_VALIDATION_ERROR`, counted by `validateConsiderationRows()`), and nothing rated at all (`EMPTY_TABLE_VALIDATION_ERROR`, from the DOM-free `hasRatedRows()` in `scoring.js`). Emptiness is reported only when no row is rated-but-unnamed, since naming that row resolves both. The dialog closes on its dismiss button and on the next successful Calculate. Inline field errors still appear as before; the dialog is what makes the refusal unmissable. jsdom does not implement `showModal`, so the open/close helpers fall back to the `open` property — the real modal path is only exercised by Playwright.

Decision-name validation lives in the UI only. `compareDecisions` no longer checks names — the `missingNames` and `nameLength` kinds, their result strings and their `formatComparison` branches were deleted once the dialog took over, because the UI blocks before scoring is ever called and unreachable code drifts. The rule itself is still single-sourced in `scoring.js` (`DECISION_NAME_MIN_LENGTH` / `MAX`, `isValidDecisionName`), which the UI imports. `compareDecisions` now trusts its caller to pass names it has already validated. Extra distinct cons still add up (that is intended). Near-duplicate phrasing is a future warning, not a formula change — see `docs/ai-duplicate-detection.md`.

Decision names are inputs `#A` / `#B` (1–50 characters after trim). Invalid names show `#A-error` / `#B-error` and `aria-invalid`. Calculate writes `#finalResult` and `scrollIntoView`s it (`aria-live="polite"`). Native `type="reset"` zeros form fields (including names); `resetSliders()` restores default 1-pro/1-con rows, sets slider labels to `"0"`, and clears the result and name errors.

### How to run

```bash
npm install                      # first clone only
npx playwright install chromium   # first clone only, for e2e
npm test                         # vitest
npm run test:e2e                 # Playwright; reuses Vite if already running
npm run serve                    # Vite, usually http://localhost:5173/
```

Vitest: `test/scoring.test.js` (outcomes, no DOM) + `test/strings.test.js` (formatComparison blocks) + `test/empty-rows.test.js` (page behavior & blank warnings via jsdom) + `test/rows.test.js` (add/remove rows) + `test/model-select.test.js` (dropdown, hints, chosen model applies on Calculate) + `test/result-display.test.js` (verdict line, contributors table, shares) + `test/validation.test.js` (Calculate blocked: missing names, unnamed rated rows, nothing rated) + `test/loadApp.js`. 151 unit tests, all passing at handoff. Playwright (`e2e/decision.spec.js`) has **never been run** — see "What to do next".

### How tests load the app

`loadApp()` injects the HTML body (scripts stripped), then `import`s `js/scripts.js` and calls `initApp()`. It assigns `calculate` / `resetSliders` / `sliderChange` onto `globalThis`. jsdom may lack `scrollIntoView`; `loadApp()` stubs it. Scoring tests `import` `js/scoring.js` directly.

jsdom **inline `onclick`** still cannot see page functions unless they are on `window` (`initApp` does that). Drive jsdom by calling `globalThis.resetSliders()` / `calculate()` (and `form.reset()` for native form reset). Do not `.click()` RESET in jsdom. Playwright **should** click Calculate / Reset.

RESET: `type="reset"` zeros inputs; `resetSliders()` sets labels to `"0"` (not `.value`) because `onclick` can run **before** the form reset.

Slider labels: `input` listeners in `initApp()`, not `onchange`. Tests dispatch `input` (or call `sliderChange`). Readout copy is `Value:` (the number is `.sliderStatus`).

### Working agreements

- Surgical changes; one concern per pass. TDD: failing test → confirm red → production code.
- Test **behavior**, not implementation details (markup, regex-on-source, how a slider is wired).
- Assert UI sentences via imports from `js/constants/strings.js`, not duplicated English in the test file.
- No narrating comments in source. Domain words: `decisionA` / `decisionB`.
- Do **not** start a framework rewrite. App JS stays under `js/` as ES modules. `src/` / an app bundler only if deploy needs a real build. Vite stays serve-only until then.
- Combined importance + impact on **one slider** is intentional. Keep the **sum**; do not average to cancel list length.
- CSS: tokens in `:root` (`--color-pro`, `--color-con`, `--color-error`, …). Slider/hint color via `--slider` / `--hint` on the element — no `!important`, no duplicated vendor overrides to win specificity. Light theme only. Do not ship a custom cursor image; `cursor: pointer` is the system pointer.
- Pico / Materialize-the-library were rejected (generic kit look). Custom CSS with a Material-ish bar/elevation is the look. Cons sliders and Cons/Concern info icons share `--color-con`.
- WebKit vs Firefox range thumbs must stay in **separate** rules (combined prefix selectors get dropped).

### What is done this stretch

Selectable scoring models (Linear, Squared, Cubed, Doubling, Dealbreaker) behind a "Try a different model" dropdown with a per-model hint. Normalized margin on the result. Dealbreaker veto with the `disqualified` outcome. The rows that decided it are a table grouped `In favor of {decision}` rather than a sentence — the sentence had to name six rows, two decisions and their ratings in one breath, and the table also resolves which column a row was typed under. `formatComparison` returns tagged blocks instead of strings to make that possible, and helper assertions read `contributorGroups()` / `contributorShares()` / `contributorsCaption()` from `test/loadApp.js`. Each contributor row then gained a share percent; it did not close the gap where nothing in the table moves between Linear, Squared and Cubed, and that gap is still open. 151 Vitest tests pass.

Earlier stretch: in-page names; START / `prompt()` removed. Name validation (min 1 / max 50, field errors, blur + calculate). Calculate scrolls `#finalResult` into view. Scoring outcomes split from UI strings. App modules under `js/` with `consideration-rows.js` extracted. Add/remove independent pro and con rows per decision (no pro/con row pairing). Inline validation warnings when a slider moves without text (`BLANK_PRO_ERROR` / `BLANK_CON_ERROR`). Accessible names and UI text centralized in `js/constants/strings.js`. Vitest + Playwright suites passing. Light panel UI: app bar, grid decision table, inset slider wells, `Value:` readouts, info-icon header tips, teal pros / terracotta cons.

### What to do next (Category 2)

Product/modeling, not bugfixes:

1. **Run the Playwright suite.** The e2e specs covering the model dropdown have never executed; Chromium would not download in the dev sandbox. Run `npx playwright install chromium && npx playwright test` before trusting `e2e/decision.spec.js`.
2. Sensitivity ("would one point flip the winner?"). Deliberately cut from the model-refinement pass; see the reasoning in `docs/model-refinement.md` §2.
3. Shared criteria matrix vs independent lists — later, if you want the same questions for both options.
4. Duplicate-phrasing warning — `docs/ai-duplicate-detection.md` (AI, not this pass).

The hosted GitHub Pages copy may still be the old percent app until redeployed.

### Files that matter

| File | Role |
|---|---|
| `index.html` | Page, name fields, grid decision table with pro/con lists, Calculate / Reset |
| `js/scoring.js` | Weights, name rules, `{ kind, … }` outcome |
| `js/constants/strings.js` | UI strings + `formatComparison` |
| `js/consideration-rows.js` | Row templates, add/remove, slider sync, blank warnings |
| `js/scripts.js` | Orchestration, DOM / `initApp` |
| `main.css` | Light Material-style layout + tokens |
| `test/loadApp.js` | jsdom loader + `fillConsideration` / `setDecisionNames` |
| `test/scoring.test.js` | Scoring outcomes |
| `test/strings.test.js` | Result sentences |
| `test/empty-rows.test.js` | Page behavior & blank row warnings |
| `test/rows.test.js` | Add/remove rows behavior |
| `test/model-select.test.js` | Model dropdown, hint swapping, model applies on Calculate |
| `test/validation.test.js` | Calculate blocked: missing names, unnamed rated rows, nothing rated |
| `test/result-display.test.js` | Verdict line, the contributors table and the shares |
| `e2e/decision.spec.js` | Browser: names, errors, reset, scroll, add/remove, model dropdown, contributors table, shares (unrun) |
| `package.json` | `vitest`, `jsdom`, `vite` (serve), `@playwright/test` |
| `REVIEW.md` | This review + handoff |


---

Reviewed: September 7, 2026  
Scope: `index.html`, `scripts.js`, `main.css`, `README.md`  
Note: `scriptstesting.js` was a second copy of `calculate()` that disagreed on negative-case divisors. It was unused by the app and has been removed.

## Intent of the app

The app helps a user compare two decisions by listing pros and cons and rating each one. The slider is meant to combine **how important the consideration is** with **how much it would affect the user** (positively for a pro, negatively for a con). A con that barely matters should count less than a con that would seriously hurt.

That model is a valid first design. A score of:

```text
option score = sum(pro weights) − sum(con weights)
```

is internally consistent. The review’s objection is not "you should have split importance and impact." The objection is that **turning those net scores into "X is N% better than Y" is not a valid calculation**, and several surrounding bugs corrupt the inputs or the UI.

---

## How the original (buggy) calculation worked

*(Fixed. Kept as the diagnosis of the old percent formula.)*

1. Collect all sliders in four groups: pros A, cons A, pros B, cons B.
2. Sum each group.
3. Net score: `resultA = prosA − consA`, `resultB = prosB − consB`.
4. Declare the larger net the winner.
5. Attempt a "percent better" figure by dividing the gap by one of the nets, with extra branches for negatives and zeros.

The README already notes that positive and negative cases use different divisors. That inconsistency is real, and it is a symptom of a deeper problem: **net scores are interval-scale, not ratio-scale.** Zero means "pros balance cons," not "none of the thing." Dividing one net by another (or by a number near zero) does not mean "percent better."

Numeric probes of the live formula in `scripts.js` produced results like:

| Scenario | Result of current formula |
|---|---|
| A = 10, B = 3 | A is 233% better |
| A = 10, B = 1 | A is 900% better |
| A = 10, B = 0 | A is 1000% better |
| A = 10, B = −1 | A is 110% better (B got worse; A’s reported lead collapsed) |
| A = 1 vs B = −1 | A is 200% better |
| A = 50 vs B = −1 | A is 102% better (A improved a lot; reported lead shrank) |
| A = 50 vs B = −50 (domination) | A is 200% better |
| A = 6 vs B = 1 (narrow win) | A is 500% better |

Making the loser worse, or the winner better, should not shrink the winner’s lead. Crossing zero should not cliff from 1000% to 110%. A total-domination case should not score lower than a small positive-vs-positive gap.

---

## Category 1 — Critical bugs and incorrect calculations

These are definite defects. They should be fixed before product/modeling redesign.

### Calculation

1. **~~"Percent better" is not a valid ratio of net scores.~~ Done.**  
   Replaced with `difference = resultA − resultB`. Live copy: `RESULT: {winner} leads {loser} by {n} points — {m}% of all points entered.`, plus a contributor line.

2. **~~Positive and negative branches use different denominators.~~ Done.**  
   Those branches are gone. Sign of the nets no longer changes the comparison method.

3. **~~Divide-by-1 when a net is 0 is a unit change, not a fix.~~ Done.**  
   A net of 0 is a normal score. Leading by 10 vs a net of 0 is reported as 10 weighted points, not 1000%.

4. **~~`scriptstesting.js` disagreed with `scripts.js` on negative cases.~~ Done.**  
   Removed. It was unused and not a test suite. Real tests belong in a later improvement.

### Input handling that corrupts the score

5. **~~Empty rows still count.~~ Done.**  
   Sliders default to `0`. `sumFilledWeights()` skips a slider unless the adjacent text field has non-whitespace. Dragging a slider with no pro/con text does not affect the score. Filling text and leaving the slider at 0 contributes 0, which is intentional.

6. **~~Reset does not restore displayed values.~~ Done.**  
   Native `type="reset"` still zeros the range inputs. `resetSliders()` now sets every `.sliderStatus` to `"0"` (hardcoded to the HTML default, because the click handler can run *before* the form reset, so copying `.value` would leave the old number).

### Result display and state bugs

7. **~~Ties leave the previous result on screen.~~ Done.**  
   Equal nets write a tie sentence onto `#finalResult` (same wording as the old alert). A later non-tie still rewrites the whole paragraph, so child spans are not required after the first `calculate()`.

8. **~~Calculate before START uses undefined names.~~ Done.**  
   START and `prompt()` are gone. Names are the `#A` / `#B` inputs, read with `.value`. Missing either name writes `RESULT: Enter both decision names first.`

9. **~~Decision names are written with `innerHTML`.~~ Done.**  
   Names are never injected as markup; they are input values, and the result is written as text.

### Code correctness (will cause wrong or fragile behavior)

10. **Implicit globals.**  
    `decisionA` / `decisionB` as assignable globals are gone. `sliderChange` no longer leaks `i`.

11. **~~Malformed HTML.~~ Done.**  
    Single `<head>` with title and stylesheet; table rows closed. (Do not lock this with source-regex tests; that is markup shape, not behavior.)

12. **~~Slider labels are paired by global index.~~ Done.**  
    `sliderChange` updates the `.sliderStatus` in the same cell as the slider that moved.

### Immediate calculation replacement (keep the weighted pro/con model)

*(Superseded. This was the recommendation at review time; it shipped, and the model-refinement pass then added selectable transforms, the normalized margin, contributors and the Dealbreaker veto on top. The rule that survives is the first line: never claim a relative "% better" from nets.)*

Do **not** keep claiming a relative "% better" from nets. Keep:

```text
scoreA = sum(filled A pro weights) − sum(filled A con weights)
scoreB = sum(filled B pro weights) − sum(filled B con weights)
difference = scoreA − scoreB
```

Report the winner and the **point difference**, e.g. "Option A leads Option B by a difference of 12 weighted points."

Optional 0–100 display if there are five pros and five cons, each 0–10:

```text
displayScore = netScore + 50
```

Then a net of −50 → 0, 0 → 50, +50 → 100. Describe the gap as **percentage points on that scale**, not "12% better."

If a 0–100-style *share of entered weight* is wanted later, a bounded alternative is `(scoreA − scoreB) / (prosA + consA + prosB + consB)`. That is still a **normalized margin chosen by the app**, not a literal "percent better," and it shrinks if the user adds equally rated items to both sides. Prefer honest wording: "A leads by N% of the total weight you entered."

Also: ~~default empty sliders to 0, and skip rows whose text is blank.~~ Done with this pass.

---

## Category 2 — Improvements (modeling, business logic, product, UX)

These are not "the current math is wrong." They are other ways to look at the problem, and ways to make the app more useful after Category 1 is fixed.

### Modeling and business logic

1. **Keep combined importance × impact on one slider if that matches how users think.**  
   Splitting "importance" vs "how much it affects me" is optional. The current single weight is a legitimate product choice.

2. **Shared criteria vs independent lists.**  
   Independent pro/con lists are good for brainstorming. They are weaker for comparison: users may list more cons for B, or rate two unrelated lists on different mental scales. A later redesign: define criteria once, rate both options on each (weighted sum / sum of weights).

3. **Optional extra factors, only if they earn their complexity.**  
   - Likelihood vs impact (`weight × probability`).  
   - Confidence / uncertainty.  
   - Dealbreakers that cannot be averaged away (hard constraints).

4. **Double-counting.**  
   The current sum is correct when extra rows are distinct. How far several moderate cons go toward outweighing fewer, higher-rated ones now depends on the selected scoring model — point for point under Linear, progressively less under Squared, Cubed and Doubling. The failure case is the same consideration written different ways ("higher salary," "more disposable income," "better finances"). That inflates the total without adding new harm or benefit. Do not change the formula for this. A future warning that detects near-duplicate phrasing is specified in [docs/ai-duplicate-detection.md](docs/ai-duplicate-detection.md).

5. **False precision.**  
   Subjective 1–10 ratings do not justify a single dramatic percentage without explaining what the number is.

6. **Sensitivity.** Still open, but **deliberately cut** from the model-refinement pass — the reasoning is in `docs/model-refinement.md` §2.  
   Show whether changing one rating by a point flips the winner. A small lead that reverses easily is more useful than a confident-looking number.

7. **Show the work.**  
   List how much each filled row contributed so users can spot mistakes and duplicates.

8. **More than two options** is a natural extension of a criteria matrix, not of two independent tables.

### App / UX / engineering improvements

9. Style and layout (already in the README): table density, slider width, visual hierarchy, mobile.

10. **~~Replace `prompt()` with in-page name fields.~~ Done.**

11. **~~Add/remove pro and con rows instead of a fixed five.~~ Done**, independently per list.

12. **~~Live slider labels via `oninput` instead of `onChange`.~~ Done** — an `input` listener in `initApp()`.

13. **~~Guard Calculate until both names exist; clear or rewrite the result on tie and on reset.~~ Done.**  
    Names, ties, and reset are all done: `resetSliders()` calls `showResultLines([])`, which empties `#finalResult`.

14. Persist a decision (localStorage) so it can be revisited.

15. **In force.** Copy that matches the math: never an unexplained "N% better." Live lead copy is "leads … by N points — M% of all points entered," and the margin is described as a share of the points entered, never as one decision being M% better.

16. **~~Add Vitest + jsdom as a test-only harness.~~ Done (no app rewrite).**  
    See **Handoff**. Tests are behavioral. Do not add source-regex markup tests.

17. **~~Declare variables with `let`/`const`; avoid implicit globals.~~ Done** in `scripts.js` (no `var`). Decision names are local, read from the table.

18. **Do not start a clean-architecture / modular rewrite during the critical-bug fixes.**  
    Still in force: defer `src/` / an app bundler until deploy needs a real build. Scoring is already extracted — `js/scoring.js` is DOM-free and `sumFilledWeights` takes plain rows plus a transform.

---

## Recommended order of work

1. ~~Delete or replace `scriptstesting.js`.~~ Removed.
2. ~~Replace the percent formula with net scores + an honest difference.~~ Done. Copy: "is better than … by N points."
3. ~~Empty-row weighting and slider defaults.~~ Done.
4. ~~Critical UI bugs.~~ Done (reset, ties, names, `textContent`, HTML, slider/label pairing). `scripts.js` modernized (`const`/`let`).
5. ~~Vitest + jsdom (test-only).~~ Done.
6. ~~Category 2 UX — `oninput`, in-page names, add/remove rows, DOM-free scoring tests.~~ Done.
7. ~~Scoring models, normalized margin, contributors, Dealbreaker veto.~~ Done — see `docs/model-refinement.md`.
8. **Next:** run the Playwright suite (it has never executed), then the remaining Category 2 items above.
9. Architecture (`src/`, app bundler) only if deploy needs a real build.

---

## What this review is *not* saying

It is not saying the weighted pro/con idea is invalid. Combining "this matters to me" and "this would affect me a lot" into one rating per consideration is the core of the product. The critical failure is **misrepresenting those nets as a percentage one decision is better than another**, plus bugs that change the numbers before that formula even runs.
