# Model refinement plan

**Status:** planned, not implemented. Agreed 11 September 2026.

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
| Linear | `r` | Every point counts the same. A 10 equals two 5s. |
| Squared (default) | `r²` | Big items weigh more. A 10 equals four 5s. |
| Cubed | `r³` | Big items dominate. A 10 equals eight 5s. |
| Doubling | `2^r`, with `w(0) = 0` | The biggest item almost always decides. A 10 equals two 9s or thirty-two 5s. |
| Dealbreaker | `r`, plus veto rule | A 10 on a con is a veto. Otherwise every point counts the same. |

**Dealbreaker veto rule.** A con rated 10 disqualifies that option. One option vetoed: the other wins; outcome kind `disqualified`; no margin, flip, or contributors (it is not a margin). Both vetoed, or neither: fall through to the plain linear comparison. A pro rated 10 is **not** a veto against the other option. If something is truly required, express it as a dealbreaker con on the option that lacks it ("not remote" rated 10). The veto exists only in this model; in every other model a 10 con is a heavy weight that can still be outweighed.

In Dealbreaker mode the con-slider hint should say that 10 means "unacceptable," not "very important."

**Behavior.** Dropdown sits in the actions row beside Calculate, hint beneath it. Default is Squared. Changing the model recalculates immediately if a result is already showing. Selection is held in memory only; no `localStorage`.

## 2. Result contents

Every field is shown wherever it applies. More information is better than less.

1. **Winner and loser.**
2. **Raw point lead**, in the selected model's units.
3. **Margin.** `|lead| / Σ w(every filled row, both options)`, rounded to a whole percent. Bounded 0–100% under every curve; 100% only when the winner is all pros and the loser all cons. Total is 0 only when nothing is filled, which is already a tie. This is a normalized margin chosen by the app, not "% better."
4. **Label**, only at the two boundaries that need no judgment call:
   - **Close call** — flip distance is 1: moving one slider one notch would tie or flip the result. The smallest possible input change changes the answer.
   - **Decisive** — no single rating, moved anywhere in 0–10, can tie or flip the result.
   - Anything between gets **no label**. The flip sentence gives the actual number instead of an arbitrary band.
5. **Smallest flip.** The specific row, its current rating, and the rating that would tie or flip the result, in the user's own units: *"Would tie if Leave's 'long commute' were rated 8 instead of 6."* If none exists: *"No single rating change would flip this."*
6. **Contributors.** Each row contributes `±w(r)` toward the winner. Show the top 2–3 rows pushing toward the winner and the single strongest row pushing the other way, with the user's ratings (not transformed weights): *"Most of Stay's lead comes from 'near family' (10) and Leave's 'long commute' (8). Pulling the other way: Leave's 'higher salary' (9)."*
7. **Veto outcome** (Dealbreaker only): *"Leave is disqualified by 'would have to sell the house' (10)."*

Example line: *"Stay leads Leave (23% margin, 7 points). Would tie if 'long commute' were rated 8 instead of 6."*

**Flip distance** is the fewest notches any single filled slider must move (staying within 0–10) so that `lead ≤ 0`, or, in Dealbreaker, so that a veto is triggered or removed. Computed by brute force: for each filled row try all 11 values and recompute. It is measured in the user's units, so it stays meaningful under every model, which is why it drives the label rather than the percent. (With two rows, a 1-point lead can be a 20% margin and still flip on one notch; that is a coin flip and the label must say so.)

Under nonlinear models the point lead is in squared or cubed units nobody can picture. The flip sentence and contributor list are the only outputs in the user's own 0–10 ratings, so they are what makes switching models understandable: change the model and see which row now decides it and how fragile it became.

## 3. Code shape

- `js/scoring.js` — `MODELS` registry (`id`, `transform`, `veto`). `compareDecisions({ ..., model })`. The `lead` outcome grows to `{ winner, loser, points, marginPercent, closeness, flip, contributors }`. New kind `disqualified`. Rows already carry `text`, so naming them needs no data changes. Stays DOM-free.
- `js/constants/strings.js` — model labels and hints; `formatComparison` for the new fields and kind.
- `js/scripts.js` — dropdown wiring, recalc on change.
- `index.html` / `main.css` — dropdown, hint, multi-line result.
- Tests — `test/scoring.test.js`: per-model scoring, including one 10 vs three 4s flipping between Linear (4s win, 12 > 10) and Squared (10 wins, 100 > 48); veto cases (one side, both sides, neither); flip search; contributors. `test/strings.test.js`: new sentences. One Playwright test: switch models, result changes.
- Docs — README scoring section. `docs/ai-duplicate-detection.md` line 8 ("several moderate cons should outweigh fewer cons weighted higher") is now true only for Linear and must be reworded. `REVIEW.md` handoff.

## Decisions log

- Percent is a normalized margin, never "% better."
- Label boundaries: only Close call (flip distance 1) and Decisive (unflippable by one rating). No middle bands.
- Dealbreaker: cons only. No must-have pro veto.
- Default model: Squared.
- Raw point lead stays visible wherever it exists.
- No `localStorage`; model choice lives in memory.
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
