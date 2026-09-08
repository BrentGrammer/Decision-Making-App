# Decision Making App — Code Review

Reviewed: September 7, 2026  
Scope: `index.html`, `scripts.js`, `scriptstesting.js`, `main.css`, `README.md`

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

1. **“Percent better” is not a valid ratio of net scores.**  
   `resultA / resultB` (or `(greater − lesser) / lesser`) is undefined in meaning when nets can be zero or negative. The output is unbounded, can explode near zero, and is not monotonic.

2. **Positive and negative branches use different denominators.**  
   When both nets are positive, the code divides by the *lesser* net (`scripts.js` around lines 131 and 168). When a net is negative, it divides by the *greater* net’s absolute value (around lines 115–117 and 151–153). The same 5-point gap can therefore mean completely different percentages depending on which side of zero it sits.

3. **Divide-by-1 when a net is 0 is a unit change, not a fix.**  
   When `resultB === 0`, the formula becomes `(resultA − 0) / 1 * 100`, i.e. `resultA × 100`. A net of 10 becomes “1000% better.” That is a different scale from every other branch, and it is the README’s Infinity% bug in disguise.

4. **`scriptstesting.js` disagrees with `scripts.js` on negative cases.**  
   The files are otherwise the same, but they swap which absolute net is used as the divisor. There are no actual tests. One of these files should become real tests or be removed so they cannot silently diverge.

### Input handling that corrupts the score

5. **Empty rows still count.**  
   Every slider defaults to `value="5"`. `calculate()` sums *all* sliders in each class, whether or not the adjacent text field has a pro/con. Unused rows inject phantom weight. If one option has fewer filled rows, it can be silently penalized or rewarded.

6. **Reset does not restore displayed values.**  
   `resetSliders()` is broken: the loop is commented out and a stray `}` closes the function early. Form reset may snap range inputs back, but the “Current Value” labels can stay stale.

### Result display and state bugs

7. **Ties leave the previous result on screen.**  
   Equal nets only `alert()`. The result paragraph (`#finalResult`) is not cleared or updated.

8. **Calculate before START uses undefined names.**  
   `decisionA` / `decisionB` are implicit globals set only in `start()`. Calculating first yields “undefined is N% better than undefined.”

9. **Decision names are written with `innerHTML`.**  
   Prompt text should go into `textContent` (or be escaped). This is an HTML-injection path.

### Code correctness (will cause wrong or fragile behavior)

10. **Implicit globals.**  
    `decisionA`, `decisionB`, loop index `i` in `sliderChange`, and `spans` in `resetSliders` leak to the global object.

11. **Malformed HTML.**  
    `<head>` is closed twice; `<title>` and the stylesheet sit outside a proper head. Several `<tr>` elements in the Decision A block are never closed. Browsers recover; the DOM (and thus slider/label pairing) is still fragile.

12. **Slider labels are paired by global index.**  
    `sliderChange()` matches `getElementsByClassName('sliders')[i]` to `sliderStatus[i]`. That only works while markup order stays aligned.

### Immediate calculation replacement (keep the weighted pro/con model)

Do **not** keep claiming a relative “% better” from nets. Keep:

```text
scoreA = sum(filled A pro weights) − sum(filled A con weights)
scoreB = sum(filled B pro weights) − sum(filled B con weights)
margin = scoreA − scoreB
```

Report the winner and the **point margin**, e.g. “Option A leads Option B by 12 weighted points.”

Optional 0–100 display if there are five pros and five cons, each 0–10:

```text
displayScore = netScore + 50
```

Then a net of −50 → 0, 0 → 50, +50 → 100. Describe the gap as **percentage points on that scale**, not “12% better.”

If a 0–100-style *share of entered weight* is wanted later, a bounded alternative is `(scoreA − scoreB) / (prosA + consA + prosB + consB)`. That is still a **normalized margin chosen by the app**, not a literal “percent better,” and it shrinks if the user adds equally rated items to both sides. Prefer honest wording: “A leads by N% of the total weight you entered.”

Also: default empty sliders to 0, and skip rows whose text is blank.

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

16. Real automated tests of scoring (empty rows, ties, negatives, zeros, one-sided lists) instead of `scriptstesting.js` as a second copy of production code.

17. Declare variables with `let`/`const`; avoid implicit globals.

---

## Recommended order of work

1. Fix empty-row weighting and slider defaults (inputs must match user intent).
2. Replace the percent formula with net scores + an honest margin (points or percentage points).
3. Fix reset, ties, START/Calculate order, `textContent`, HTML, and globals.
4. Delete or replace `scriptstesting.js` with actual tests.
5. Then consider shared criteria, sensitivity, dealbreakers, and richer UX.

---

## What this review is *not* saying

It is not saying the weighted pro/con idea is invalid. Combining “this matters to me” and “this would affect me a lot” into one rating per consideration is the core of the product. The critical failure is **misrepresenting those nets as a percentage one decision is better than another**, plus bugs that change the numbers before that formula even runs.
