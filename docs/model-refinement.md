# Model refinement plan

**Status:** complete. Agreed and built 11 September 2026; all five sections shipped. Kept as the decisions log and the record of what was deliberately cut. See **Where this stands** for the loose ends.

## Why

The app currently reports the winner and a raw point lead (`net = pros − cons`, `lead = netA − netB`). Two problems:

1. A point lead is hard to interpret. 3 points out of 6 total is a rout; 3 out of 200 is a coin flip. The number does not say how much to trust the verdict.
2. The sum is linear, so one 10 equals two 5s or five 2s. The intended feel is that an extremely important consideration should be much harder for several moderate ones to cancel out.

"A is X% better than B" is not a valid statement on this scale. Net scores are interval-scale (zero means pros balance cons, not "nothing"), so ratios of nets are meaningless. This was the bug diagnosed in `REVIEW.md`. Nothing below claims "% better."

## 1. Scoring models (dropdown)

Each model is a transform `w(r)` applied to every filled row's 0–10 rating before summing. All models keep:

```text
netA = Σ w(prosA) − Σ w(consA)
netB = Σ w(prosB) − Σ w(consB)
lead = netA − netB
```

| Model | `w(r)` | Hint shown beside the dropdown |
|---|---|---|
| Linear | `r` | Every point counts the same: one 10 counts as much as two 5s. |
| Squared (default) | `r²` | The highest importance and concern ratings count for more: one 10 counts as much as four 5s. |
| Cubed | `r³` | The highest importance and concern ratings count for much more: one 10 counts as much as eight 5s. |
| Doubling | `2^r`, with `w(0) = 0` | The single highest importance or concern rating almost always decides: one 10 counts as much as two 9s, or thirty-two 5s. |
| Dealbreaker | `r`, plus veto rule | A con rated 10 for concern rules that option out entirely. Otherwise every point counts the same. |

**Dealbreaker veto rule.** A con rated 10 disqualifies that option. One option vetoed: the other wins; outcome kind `disqualified`; no margin, flip, or contributors (it is not a margin). Both vetoed, or neither: fall through to the plain linear comparison. A pro rated 10 is **not** a veto against the other option. If something is truly required, express it as a dealbreaker con on the option that lacks it ("not remote" rated 10). The veto exists only in this model; in every other model a 10 con is a heavy weight that can still be outweighed.

In Dealbreaker mode the con-slider hint should say that 10 means "unacceptable," not "very important."

**Behavior.** Dropdown sits in the actions row immediately right of Calculate and Reset, labelled "Try a different model," hint beneath it. Hints are written impersonally — "The highest importance and concern ratings count for more," never "your" ratings. Default is Squared. Changing the model swaps the hint but leaves any showing result alone — the user can browse models without losing the result they are reading, and the new model is applied on the next Calculate. Selection is held in memory only; no `localStorage`.

## 2. Result contents

Every field is shown wherever it applies. More information is better than less.

1. **Winner and loser.**
2. **Raw point lead**, in the selected model's units.
3. **Margin.** `|lead| / Σ w(every filled row, both options)`, rounded to a whole percent. Bounded 0–100% under every curve; 100% only when the winner is all pros and the loser all cons. Total is 0 only when nothing is filled, which is already a tie. This is a normalized margin chosen by the app, not "% better."
4. **Contributors.** Each row contributes `±w(r)` toward the winner. Show the top 2–3 rows pushing toward the winner and the single strongest row pushing the other way, with the user's ratings (not transformed weights). (Shipped as a sentence, then replaced by a grouped table — see **Where this stands** item 6 — which then gained a share bar per row, item 7.)
5. **Veto outcome** (Dealbreaker only): *"Leave is disqualified by 'would have to sell the house' (10)."*

Example block, as shipped:

```text
RESULT: Stay leads Leave by 7 points — 23% of all points entered.

Top contributors (?)

IN FAVOR OF STAY
Stay     pro   Stable team       10
Leave    con   Long commute       8

IN FAVOR OF LEAVE
Leave    pro   Higher salary      9
```

Under nonlinear models the point lead is in squared or cubed units nobody can picture. The contributors table is the only output in the user's own 0–10 ratings. It was expected to make switching models understandable; in practice it does not, except under Doubling — see the loose end in **Where this stands**.

**Cut: the flip check.** Earlier drafts of this plan added a "smallest flip" sentence (*"Would tie if 'long commute' were rated 8 instead of 6"*) and, from it, **Close call** / **Decisive** labels. Both are cut. The idea was sound — it is the only honest read on whether a verdict is fragile — but it needed a brute-force search over every filled row × 11 values, a tie-break rule for when several rows are equally cheap to flip, its own vocabulary, and a sentence that took several attempts to explain in plain English. That is most of the remaining complexity for the smaller half of the payoff; contributors answer "why did this win," which is what people actually want. The cost of cutting: the margin percent can read as comfortable when the result is in fact one notch from flipping (two rows, 5 vs 4 — an 11% margin that a single notch ties). Accepted. The flip check is self-contained and nothing else depends on it, so it can return later if the result block turns out to hide fragility.

## 3. Code shape

- `js/scoring.js` — `MODELS` registry (`id`, `transform`, `veto`). `compareDecisions({ ..., model })`. The `lead` outcome grows to `{ winner, loser, points, marginPercent, contributors }`. New kind `disqualified`. Rows already carry `text`, so naming them needs no data changes. Stays DOM-free.
- `js/constants/strings.js` — model labels and hints; `formatComparison` for the new fields and kind.
- `js/scripts.js` — dropdown wiring; the chosen model applies on the next Calculate.
- `index.html` / `main.css` — dropdown, hint, multi-line result.
- Tests — `test/scoring.test.js`: per-model scoring, including one 10 vs three 4s flipping between Linear (4s win, 12 > 10) and Squared (10 wins, 100 > 48); veto cases (one side, both sides, neither); contributors. `test/strings.test.js`: new sentences. One Playwright test: switch models, result changes.
- Docs — README scoring section. `docs/ai-duplicate-detection.md` line 8 ("several moderate cons should outweigh fewer cons weighted higher") is now true only for Linear and must be reworded. `REVIEW.md` handoff.

## Where this stands

Last worked 11 September 2026, on branch `feature/model-refinement`. 124 unit tests pass across six files (`npx vitest run`).

### Done

1. **Scoring models.** `MODELS` registry in `js/scoring.js` (`id`, `transform`, and `veto: true` on Dealbreaker), `DEFAULT_MODEL_ID`, `resolveModel` (unknown or missing id falls back to the default rather than throwing), and `compareDecisions({ ..., model })`. `sumFilledWeights` takes a transform.
2. **Model dropdown.** Labelled "Try a different model" in the actions row, options built from the registry so labels have one source of truth, hint beneath it from `MODEL_HINTS`. Default Squared. Changing the model swaps the hint only; the new model applies on the next Calculate. Memory only, no `localStorage`.
3. **Margin.** `marginPercent` on the `lead` outcome. Wording is *"That gap is 23% of all points entered."*, kept in its own sentence so the percent is never adjacent to the claim that one decision is better. `formatComparison` now returns an **array of lines**, and `#finalResult` is a `<div>` holding one `<p class="result-line">` per line — so a later step adds a line rather than rewriting a sentence. `showResultLines([])` clears it.

4. **Contributors.** `contributors: { toward, against }` on the `lead` outcome — up to the three rows pushing hardest toward the winner and up to the three pushing hardest the other way. (§2 specified one row against; three a side was chosen instead, since the opposing case is what someone second-guessing a verdict most wants to see. Past three a side the sentence stops reading, so showing every row would need a list or table rather than a sentence.) Each entry is `{ text, rating, option }`, carrying the user's own 0–10 rating. Rows with no text, and rows whose weight is 0, are left out. `contributorsResult` renders the second line, attributing a row to the loser by name and leaving the winner's own rows bare ("Most of Stay's lead comes from \"near family\" (10) and Leave's \"long commute\" (8). Pulling the other way: Leave's \"higher salary\" (9)."). DOM tests that are not about the result block now read `verdictLine()` from `test/loadApp.js` instead of the whole `#finalResult` text.

5. **Dealbreaker veto.** `compareDecisions` reads the model's `veto` flag and short-circuits before any scoring: a filled con rated `DEALBREAKER_RATING` (10) rules that option out. One option ruled out returns `{ kind: "disqualified", winner, loser, dealbreakers }` — no points, margin, or contributors. Both ruled out, or neither, falls through to the ordinary comparison. Pros are never vetoes, and blank rows rated 10 do not count. The concern column's hint (`#concern-hint` in `index.html`) swaps to `DEALBREAKER_CONCERN_HINT` whenever the selected model vetoes, driven off the flag rather than the model id.

6. **Contributors as a table.** The sentence in §2 item 4 was replaced after it shipped, because it had to name up to six rows, two decisions and their ratings in one breath, and it never said which column a row was typed under. `formatComparison` now returns tagged blocks — `{ kind: RESULT_BLOCK.line, text }` and `{ kind: RESULT_BLOCK.contributors, groups }` — which `js/scripts.js` renders as a `<p class="result-line">` and a `<table class="contributors">`. The table is captioned "Top contributors" with an info-icon tooltip explaining it, since a table that arrives with only two group headings does not say what it is counting. Each group is headed `In favor of {decision}`, the winner's first, the loser's only when something favours it, and each row prints the decision it was typed under, `pro`/`con`, the text, and the user's own rating. Contributors carry a `type` from the new `CONSIDERATION_TYPE` in `scoring.js` to make the third column possible. Ties and vetoes stay a single line with no table.

7. **Share of all points entered.** Each contributor carries a `share` — its transformed weight over `weightEntered`, the same denominator `marginPercent` uses, so "of all points entered" has one definition. It renders as a fifth column showing a plain percent. It was first drawn as a bar with the number hidden, on the reasoning that a rounded share of subjective 0–10 ratings does not deserve a percent column; that was wrong twice over — the bars read as meaningless stubs, because real shares cluster between 5% and 30% of a bar scaled to 100%, and hiding the number removed the only part anyone could read. Plain percent, right-aligned, tabular figures.

   Keep it for what it actually tells you — how much of the verdict rests on one consideration, which is close to the fragility question the flip check was cut for — **not** as a demonstration of model choice, which it fails at. See the loose end below.

8. **Docs.** README gained "Scoring models" and "Reading the result" sections. `docs/ai-duplicate-detection.md` no longer claims several moderate cons outweigh fewer higher-rated ones; it now says the answer depends on the selected model. `REVIEW.md` handoff rewritten for this stretch, with the unrun Playwright suite as the next task.

### Left

Nothing in this plan. Outstanding work is listed in `REVIEW.md` under "What to do next".

### Known loose ends

- **Playwright is unverified.** The e2e specs for the dropdown were written but never run: chromium will not download in the dev sandbox. Run `npx playwright install chromium && npx playwright test` before trusting `e2e/decision.spec.js`.
- **Contributor ranking does not move between models, and share barely does either.** Every transform is monotone increasing, so rows rank in the same order under Linear, Squared, Cubed and Doubling; only the *winner* can change, flipping a row between `toward` and `against`. Ranking is not the thing to fix — reordering would mean a 7 outweighing a 9, which would be a bug. Magnitude is the only thing a model touches, which is why item 7 added a per-row share. **That did not solve the problem it was added for.** Share is normalized, so squaring inflates the denominator too and only the *ratios* between rows survive — and ratios of similar ratings compress hard (8 vs 7 is 1.14×; 8² vs 7² only 1.31×). On a realistic six-row table rated 5–9, the top row's share goes 19% → 21% → 23% across Linear → Squared → Cubed. Invisible. Only Doubling moves it sharply, and there it usually flips the winner anyway, which reorganizes the whole table on its own.

  The mistake was generalizing from a two-row table rated 9 and 3 (75% → 90% → 98%): a wide spread and a tiny row count is the best possible case for this metric, not a typical one. **So: nothing in the result block makes the difference between Linear, Squared and Cubed visible on ordinary input, and the share column does not change that.** If that difference needs to be legible, it needs a different mechanism — most likely the "compare all models" table in the decisions log, which states each model's winner outright instead of hoping a derived number reveals it.

### Conventions in force

Tests pin their own subject: DOM tests about rows, names, or reset select Linear explicitly (`selectScoringModel` in `test/loadApp.js`) so their arithmetic does not silently re-base when the default model changes. Outcome tests that care about the winner use `toMatchObject`, not `toEqual`, so adding a field to the outcome does not break them.

## How this gets built

Small steps, each one reviewable on its own.

**Test-driven.** Write the test first, run it, confirm it fails for the right reason, then write the production code that makes it pass.

**Tests do not assert on exact wording.** A test checks that the result names the right rows, in the right order, on the right line. Pinning a whole sentence turns every copy edit into a test failure while testing nothing real. Assert on specific words only where the wording is itself the behavior, such as the check that the margin copy avoids the word "better."

**Tests assert observable behavior, not implementation.** A test drives the app the way a user does — fill the decision table, choose a model, calculate, read the result — or calls a public function and checks its outcome. No asserting on the shape of the `MODELS` registry, on a transform in isolation, or on anything else a refactor could rename without changing what the app does. Where a test's subject is not the thing under change (a row-counting test that happens to sum points), pin the unrelated variable explicitly so its arithmetic stays about its own subject.

**No shims, no backwards compatibility, no transitional scaffolding.** This is an update, not a migration. The app is allowed to be inconsistent between steps — a hint that describes behavior landing two steps later is fine and needs no caveat.

**Never assert on what used to be true or will be true later.** No "scores like linear for now," no "does not yet veto." A test states what the app does today; when behavior arrives, its test arrives with it.

## Decisions log

- Percent is a normalized margin, never "% better." The verdict does say one decision "is better than" the other by N points — a difference is valid on an interval scale — but that claim and the percent live in separate sentences, guarded by a test.
- Cut the flip check and the Close call / Decisive labels — complexity outweighed the payoff. See §2.
- Dealbreaker: cons only. No must-have pro veto.
- Default model: Squared.
- Dropdown label is "Try a different model," placed to the right of Calculate and Reset so the two things a user clicks together sit together.
- Changing the model does not recalculate; the showing result stands until the user clicks Calculate again.
- Raw point lead stays visible wherever it exists.
- No `localStorage`; model choice lives in memory.
- Contributors are a table grouped "In favor of {decision}", not a sentence. Both group headings take the same form, so neither side reads as the app's own verdict.
- Contributor share is printed as a plain percent. A bar was tried and rejected: unlabelled stubs in the bottom third of their range, and no number to read.
- Later, optional: a "compare all models" table (winner and label per model).

---

# Historical context

The transcript below is the conversation that produced the plan above. It is kept for the reasoning; where it conflicts with the plan, the plan wins.

Short answer: your instinct is right that a raw point lead is hard to interpret, and "gap ÷ total points" is a legitimate thing to compute.
 But it is not "X% better," and the wording matters more than the formula. Here's why, grounded in your current code.

 What the current math is

 scoring.js:34-36 and scoring.js:61-71



   netA = prosA − consA
   netB = prosB − consB
   lead = netA − netB      (reported as "by N points")


 Why "X% better" doesn't work on this scale

 "A is 30% better than B" is a ratio statement: it needs a scale where zero means "none of the thing" (price, weight, distance). Your net
 score is an interval scale: zero means "pros and cons balance," which is an arbitrary midpoint, not "nothing." Ratios across an arbitrary
 zero produce nonsense — this project already hit that. Your  REVIEW.md  documents the old formula giving 1000% for 10 vs 0, then collapsing
 to 110% for 10 vs −1, and 500% for a narrow 6 vs 1 win while total domination (50 vs −50) scored 200%. REVIEW.md:142-153

 No choice of denominator fixes that, because the problem is the claim, not the arithmetic. There is no honest number that means "A is X%
 better than B" here.

 What your idea does give you: a normalized margin

  lead ÷ total weight entered  is fine, as long as you say what it is:



   total  = prosA + consA + prosB + consB
   margin = |netA − netB| / total


 Example: A has pros 15 / cons 5 (net 10), B has pros 12 / cons 5 (net 7). Lead = 3, total = 37, margin ≈ 8%.

 Properties worth knowing:

   • Bounded 0–100%. 100% only when A is all pros and B is all cons. No divide-by-zero cliffs (total is 0 only when nothing is filled in,
   which is already a tie).
   • It's a measure of decisiveness, not superiority. "3 points out of 6" is a rout; "3 points out of 200" is a coin flip. That's the actual
   information the raw lead is missing, and it's genuinely useful.
   • It shrinks when you add equally weighted items to both sides. That's arguably correct — more weighed considerations with the same gap is
   a closer call — but it means the number is "chosen by the app," not a fact about the decisions.
   • Same subjective inputs, same precision. 0–10 sliders don't justify "8.1%." Round to whole percents.

 Honest wording: "A leads B by 3 points — 8% of the total weight you entered." Not "A is 8% better."

 An alternative you might see elsewhere, and why I'd avoid it as the main score

 Some tools score each option as  pros / (pros + cons)  — "A is 75% positive, B is 60% positive." That is a real ratio per option, and it
 reads nicely. But it throws away magnitude: one pro at 10 with no cons scores 100%, beating five pros at 10 with one con at 2 (96%). That
 directly contradicts your stated model that several moderate items should be able to outweigh fewer big ones (ai-duplicate-detection.md:8
 -8). Fine as a supplementary readout, bad as the verdict.

 My recommendation

 Keep the point lead as the primary result (it's the true output of your model), and add the normalized margin as context, with the "% of
 total weight" wording. That gets you what you actually want — a sense of how decisive the lead is — without misrepresenting it. It also
 pairs naturally with the sensitivity idea already in your README ("would one point flip the winner?"), which is the other honest way to
 communicate closeness.

 If you want, I can implement this: add  total  and  marginPercent  to the  lead  outcome in  scoring.js , update  formatComparison  in  stri
 ngs.js , and extend  test/scoring.test.js  and  test/strings.test.js . Small change, all DOM-free.

❭ Okay, but percent of total weight is also not very informative. I don't like, what does that mean It's a technical description, but what's
  the meaning of it What's the purpose of paying attention to the percent of total weight So we need like better wording to make it clear why
  this number is important and what this number represents in terms of that instead of technically what it is.And now don't implement
  anything. We need to just plan this out. Now your point about the model saying that several moderate items should be able to outweigh fewer
  big ones. I'm also not 100% sure that's exactly correct because if you have a pro or a con that is extremely important, let's say you rate
  it as a 10, and then several moderate pros or cons, which are less important to you, it seems like the one that's more important should
  have a heavier weight because there's higher importance there. It's really important to you in the decision. And then lesser important
  items, even if there's several of them, it should be much more difficult for those to cancel out an extremely important pro or con. Do you
  understand what I'm saying?

 Yes, I understand both points, and I think they're connected. Let me take them in turn, then show how they fit together.

 1. What the number is for

 You're right — "8% of total weight" tells the user what was computed, not what to do with it. So ask: why would a user care how big the lead
 is at all?

 The only real purpose is "how much should I trust this verdict?" A 3-point lead means something different when it rests on two ratings
 versus twenty, because those 0–10 ratings are gut feelings that could easily be a notch or two off. The user needs to know whether the
 verdict is robust to that fuzziness or whether it's basically a coin flip dressed up as an answer.

 Once you frame it that way, a percentage is the wrong output. The meaningful outputs are:

 a) A plain-language verdict on closeness, e.g. Close call / Clear lead / Decisive. The label is what the user reads; the normalized margin
 (or the sensitivity check below) is just the internal rule that picks the label. Nobody has to see "8%".

 b) The smallest change that would flip it, naming the actual row: "If you rated 'long commute' an 8 instead of a 6, this would be a tie."
 This is the most honest and most useful thing the app can say. It's concrete, it points the user at the exact rating they should double-
 check, and it's true regardless of how the math works underneath. A verdict that flips on one slider notch is a close call; one that
 survives any single rating being wrong by 3 is solid.

 c) What drove the result: "Most of Stay's lead comes from 'near family' (10) and 'lower rent' (8)." Explains why, which is what a user
 actually wants from a decision tool.

 Your README already lists (b) and (c) as future improvements. I'd say they aren't add-ons — they are the answer to "what does the lead
 mean," and they replace the percentage rather than sit alongside it.

 2. Should one 10 outweigh several moderate items?

 I understand exactly what you mean, and it's a legitimate design choice — arguably the more realistic one. Right now the sum is linear: one
 10 = two 5s = five 2s. You're saying a 10 should be disproportionately heavy, because "extremely important to me" isn't just "five times a
 2."

 The way to get that is a convex weighting curve: transform each rating before summing, so high ratings grow faster than linear. The choice
 of curve is the value judgment, and you can describe each one in plain terms:

 ┌─────────────────────┬─────────────────────────────────┬────────────────────────────────────────────────────────────────────────┐
 │ Curve               │ One 10 equals…                  │ Character                                                              │
 ├─────────────────────┼─────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
 │ Linear (current)    │ two 5s, five 2s                 │ Quantity matters as much as intensity                                  │
 ├─────────────────────┼─────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
 │ Squared             │ four 5s, twenty-five 2s         │ A 10 is heavy; three 6s still beat it                                  │
 ├─────────────────────┼─────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
 │ Cubed               │ eight 5s, 125 2s                │ A 10 nearly dominates; needs two 8s to match                           │
 ├─────────────────────┼─────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
 │ Doubling (2^rating) │ thirty-two 5s, two 9s           │ Almost lexicographic: the biggest item decides                         │
 ├─────────────────────┼─────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
 │ Dealbreaker flag    │ nothing                         │ A 10 (or a checkbox) is a veto, not a weight                           │
 └─────────────────────┴─────────────────────────────────┴────────────────────────────────────────────────────────────────────────┘

 Things to weigh:

   • It's a direct reversal of the current stated model ( docs/ai-duplicate-detection.md  line 8: "several moderate cons should outweigh
   fewer cons weighted higher"). That's fine, but it should be a deliberate decision, and that doc's rationale would need rewriting.
   • Linear already lets a user express this, in theory, by rating minor things 1–2 and the big thing 10. The argument for convex is that
   people don't actually use sliders that way — "moderate" tends to land at 5–6, not 2 — so the curve corrects for how people really rate. I
   find that persuasive.
   • The steeper the curve, the more the app becomes "find the single biggest item." Squared or cubed keeps a real trade-off; doubling
   basically doesn't. My instinct is squared or cubed, and the UI hint can say it plainly: "A 10 counts as much as four 5s."
   • Dealbreakers might deserve their own concept. If a con is genuinely disqualifying, that's not a weight at all — it's a constraint. A
   separate "dealbreaker" toggle is more honest than hoping the curve makes a 10 big enough.

 How the two connect

 A convex curve makes "leads by N points" even less meaningful — the points are now squared-rating units nobody can picture. That's another
 reason to stop reporting a number and instead report in the user's own terms: the closeness label, the specific rating that would flip it,
 and the rows that drove it. Those stay meaningful under any curve.
