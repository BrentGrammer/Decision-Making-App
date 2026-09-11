# DECISION MAKING APP

[TRY IT OUT](https://brentgrammer.github.io/Decision-Making-App/)

Compare two options by listing pros and cons and rating each one from 0–10. Each rating is both how important that consideration is and how much it would affect you. Empty rows are ignored.

The app scores each option as **pros minus cons**, then reports which decision is better, by how many points, and which considerations favour each decision. A tie, or missing names, is stated in plain language.

## Scoring models

The **Try a different model** dropdown sets how much a high rating outweighs several low ones. Each model rescales every rating before adding it up: Squared multiplies each rating by itself, so a 10 contributes 100 and a 5 contributes 25, making one 10 worth four 5s. Squared is the default. The new model applies the next time you press Calculate.

| Model | One 10 counts as much as |
|---|---|
| Linear | two 5s — every point counts the same |
| Squared (default) | four 5s |
| Cubed | eight 5s |
| Doubling | two 9s, or thirty-two 5s — the single highest rating almost always decides |
| Dealbreaker | nothing: a con rated 10 rules that option out entirely |

**Dealbreaker** applies a veto. A con you rate 10 disqualifies that option outright, and the other one wins regardless of points. If both options carry one, or neither does, scoring falls back to Linear. Only cons can veto: to express something as required, write it as a con on the option that lacks it ("not remote", rated 10).

## Reading the result

A result is a verdict line followed by a table of the considerations that favour each decision.

The verdict line reports **which decision is better, by how many points**, and **the margin** — that gap as a share of total points, rounded to a percent. The margin says how decisive the gap is: 3 points out of 6 is more significant, 3 out of 200 is a coin flip. Note that the percent is a share of the points you entered; it is *not* a claim that one decision is that much better than the other, which is not a meaningful thing to say on this scale.

The table lists the strongest considerations pushing each way, grouped under the decision they favour. A consideration favours a decision by being one of its pros or one of the other option's cons, so each row names the decision it was typed under. The rating shown is the one you gave.

The last column is that row's **share of all points entered** — how much of the verdict rests on that single consideration. A row at 46% means the decision is close to resting on one thing; a table where nothing exceeds 20% means the verdict is spread across many considerations. That is a useful sanity check on a result, and a good prompt to re-read the row carrying the most weight.

## Use the App

- Run `npm run serve` (Vite, usually http://localhost:5173/) and open that URL, or visit [the hosted page](https://brentgrammer.github.io/Decision-Making-App/).
- Type each option’s name in the Decision column (1–50 characters), fill rows, then **Calculate**. Rate a consideration either by dragging its slider or by typing a number from 0 to 10 in the **Value** box beside it — the two stay in step, and typing is usually easier on a phone. A rating of 0 means the consideration does not count. Calculate stops and says what is wrong, rather than scoring a decision table it cannot read, when a decision has no name, when a row carries a rating but no text (a row only counts once it has text), or when nothing has been rated yet. 
- **Save** downloads the current table as a plain JSON file; **Load** restores one. The file stays on your device—there are no accounts, cloud storage, or browser storage.
- **RESET** clears names, inputs, slider labels, and the result, and returns the model to Squared.

```bash
npm install   # first clone only
npm test
npm run test:e2e:docker   # end-to-end tests via Docker
npm run serve
```

### Future improvements

- Sensitivity: "would one point flip the winner?"
- A table comparing every model at once (winner per model)
- Warn when the same pro or con is listed more than once in different words ([AI duplicate detection](docs/ai-duplicate-detection.md))
