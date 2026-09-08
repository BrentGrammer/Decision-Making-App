# Decision Making App — Code Review

Reviewed: September 7, 2026  
Scope: `index.html`, `scripts.js`, `main.css`, `README.md`  
Note: `scriptstesting.js` was a second copy of `calculate()` that disagreed on negative-case divisors. It was unused by the app and has been removed.

## Intent of the app

The app helps a user compare two decisions by listing pros and cons and rating each one. The slider is meant to combine **how important the consideration is** with **how much it would affect the user** (positively for a pro, negatively for a con). A con that barely matters should count less than a con that would seriously hurt.

That model is a valid first design. A score of:

```text
option score = sum(pro weights) − sum(con weights)
```

is internally consistent. The review’s objection is not “you should have split importance and impact.” The objection is that **turning those net scores into “X is N% better than Y” is not a valid calculation**, and several surrounding bugs corrupt the inputs or the UI.

---

## How the current calculation works

1. Collect all sliders in four groups: pros A, cons A, pros B, cons B.
2. Sum each group.
3. Net score: `resultA = prosA − consA`, `resultB = prosB − consB`.
4. Declare the larger net the winner.
5. Attempt a “percent better” figure by dividing the gap by one of the nets, with extra branches for negatives and zeros.

The README already notes that positive and negative cases use different divisors. That inconsistency is real, and it is a symptom of a deeper problem: **net scores are interval-scale, not ratio-scale.** Zero means “pros balance cons,” not “none of the thing.” Dividing one net by another (or by a number near zero) does not mean “percent better.”

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

1. **~~“Percent better” is not a valid ratio of net scores.~~ Done.**  
   Replaced with `difference = resultA − resultB`. The UI reports the leader and `Math.abs(difference)` as weighted points (“leads by a difference of N weighted points”). Empty rows still feed the sums (separate bug).

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
   Names come from `#A` / `#B` (`textContent`). Missing either name writes `RESULT: Enter both decision names first.`

9. **~~Decision names are written with `innerHTML`.~~ Done.**  
   `start()` uses `textContent`, so prompt text is not parsed as HTML.

### Code correctness (will cause wrong or fragile behavior)

10. **Implicit globals.**  
    `decisionA` / `decisionB` as assignable globals are gone. `sliderChange` no longer leaks `i`.

11. **~~Malformed HTML.~~ Done.**  
    Single `<head>` with title and stylesheet; table rows closed. (Do not lock this with source-regex tests; that is markup shape, not behavior.)

12. **~~Slider labels are paired by global index.~~ Done.**  
    `sliderChange` updates the `.sliderStatus` in the same cell as the slider that moved.

### Immediate calculation replacement (keep the weighted pro/con model)

Do **not** keep claiming a relative “% better” from nets. Keep:

```text
scoreA = sum(filled A pro weights) − sum(filled A con weights)
scoreB = sum(filled B pro weights) − sum(filled B con weights)
difference = scoreA − scoreB
```

Report the winner and the **point difference**, e.g. “Option A leads Option B by a difference of 12 weighted points.”

Optional 0–100 display if there are five pros and five cons, each 0–10:

```text
displayScore = netScore + 50
```

Then a net of −50 → 0, 0 → 50, +50 → 100. Describe the gap as **percentage points on that scale**, not “12% better.”

If a 0–100-style *share of entered weight* is wanted later, a bounded alternative is `(scoreA − scoreB) / (prosA + consA + prosB + consB)`. That is still a **normalized margin chosen by the app**, not a literal “percent better,” and it shrinks if the user adds equally rated items to both sides. Prefer honest wording: “A leads by N% of the total weight you entered.”

Also: ~~default empty sliders to 0, and skip rows whose text is blank.~~ Done with this pass.

---

## Category 2 — Improvements (modeling, business logic, product, UX)

These are not “the current math is wrong.” They are other ways to look at the problem, and ways to make the app more useful after Category 1 is fixed.

### Modeling and business logic

1. **Keep combined importance × impact on one slider if that matches how users think.**  
   Splitting “importance” vs “how much it affects me” is optional. The current single weight is a legitimate product choice.

2. **Shared criteria vs independent lists.**  
   Independent pro/con lists are good for brainstorming. They are weaker for comparison: users may list more cons for B, or rate two unrelated lists on different mental scales. A later redesign: define criteria once, rate both options on each (weighted sum / sum of weights).

3. **Optional extra factors, only if they earn their complexity.**  
   - Likelihood vs impact (`weight × probability`).  
   - Confidence / uncertainty.  
   - Dealbreakers that cannot be averaged away (hard constraints).

4. **Double-counting.**  
   “Higher salary,” “more disposable income,” and “better finances” may be the same benefit three times.

5. **False precision.**  
   Subjective 1–10 ratings do not justify a single dramatic percentage without explaining what the number is.

6. **Sensitivity.**  
   Show whether changing one rating by a point flips the winner. A small lead that reverses easily is more useful than a confident-looking number.

7. **Show the work.**  
   List how much each filled row contributed so users can spot mistakes and duplicates.

8. **More than two options** is a natural extension of a criteria matrix, not of two independent tables.

### App / UX / engineering improvements

9. Style and layout (already in the README): table density, slider width, visual hierarchy, mobile.

10. Replace `prompt()` with in-page name fields.

11. Add/remove pro and con rows instead of a fixed five.

12. Live slider labels via `oninput` instead of `onChange` (updates only on mouse-up).

13. Guard Calculate until both names exist; clear or rewrite the result on tie and on reset.

14. Persist a decision (localStorage) so it can be revisited.

15. Copy that matches the math: “leads by N weighted points” or “N percentage points on a 0–100 scale,” never an unexplained “N% better.”

16. **~~Add Vitest + jsdom as a test-only harness.~~ Done (no app rewrite).**  
    The page is still static `index.html` + `scripts.js`. Tests live under `test/`, run with `npm test` / `npm run test:watch`. `test/loadApp.js` injects the classic script into jsdom.

    Characterization tests already cover empty-row weighting. Remaining UI bugs should be TDD’d in this harness (reset has `it.todo`). Extracting a DOM-free `score.js` is still optional later.

    Do not add a second copy of `calculate()` as “tests.” Do not mix a new product bugfix into the same change as harness setup.

17. Declare variables with `let`/`const`; avoid implicit globals.

18. **Do not start a clean-architecture / modular rewrite during the critical-bug fixes.**  
    `calculate()` currently mixes DOM reads, scoring, and result painting. That is messy but expected for a ~100-line draft. A layers/modules/framework split now would hide whether a surgical bug fix actually worked.

    `sumFilledWeights` / `considerationText` still talk to the DOM (skip blank sibling text fields). That was the empty-row bugfix, not a test harness. A later Vitest pass should extract the same rule as a pure function of `{ text, weight }` lists.

    Defer: extra files, bundlers, frameworks, and “business vs presentation” folders. Those pay off after critical bugs are done, if the app grows (tests, more screens, or a criteria-matrix redesign).

---

## Recommended order of work

1. ~~Delete or replace `scriptstesting.js`.~~ Removed (unused duplicate, not tests).
2. ~~Replace the percent formula with net scores + an honest difference.~~ Done (`scripts.js` / result copy in `index.html`; wording is “leads by a difference of N weighted points”).
3. ~~Fix empty-row weighting and slider defaults.~~ Done (`value="0"`; skip blank pro/con text via `sumFilledWeights` in `scripts.js`).
4. Critical UI bugs. ~~Reset, ties, names, `textContent`, HTML, slider/label pairing.~~ Done.
5. ~~Add Vitest + jsdom (test-only; app stays static HTML).~~ Done.
6. Then consider shared criteria, sensitivity, dealbreakers, and richer UX.
7. Further architecture (separate UI vs scoring files, bundler for the app itself) only if the app is growing.

---

## What this review is *not* saying

It is not saying the weighted pro/con idea is invalid. Combining “this matters to me” and “this would affect me a lot” into one rating per consideration is the core of the product. The critical failure is **misrepresenting those nets as a percentage one decision is better than another**, plus bugs that change the numbers before that formula even runs.
