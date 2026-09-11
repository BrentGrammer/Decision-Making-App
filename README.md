# DECISION MAKING APP

[TRY IT OUT](https://brentgrammer.github.io/Decision-Making-App/)

Compare two options by listing pros and cons and rating each one from 0–10. Each rating is both how important that consideration is and how much it would affect you. Empty rows are ignored.

The app scores each option as **pros minus cons**, then reports which decision leads, by how many points, and what drove the result. A tie, or missing names, is stated in plain language.

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

A result reports:

- **Which decision leads, and by how many points**
- **The margin** — that point lead as a share of total points, rounded to a percent. It says how decisive the lead is: 3 points out of 6 is more significant, 3 out of 200 is a coin flip.
- **What drove it** — the three rows pushing hardest toward the winner, and the three pushing hardest the other way.

## Use the App

- Run `npm run serve` (Vite, usually http://localhost:5173/) and open that URL, or visit [the hosted page](https://brentgrammer.github.io/Decision-Making-App/).
- Type each option’s name in the Decision column (1–50 characters), fill rows, then **Calculate**. Calculate stops and says what is wrong, rather than scoring a decision table it cannot read, when a decision has no name, when a row carries a rating but no text (a row only counts once it has text), or when nothing has been rated yet. 
- **RESET** clears names, inputs, slider labels, and the result, and returns the model to Squared.

```bash
npm install   # first clone only
npx playwright install chromium   # first clone only, for browser tests
npm test
npm run test:e2e
npm run serve
```

### Future improvements

- Sensitivity: "would one point flip the winner?"
- A table comparing every model at once (winner per model)
- Warn when the same pro or con is listed more than once in different words ([AI duplicate detection](docs/ai-duplicate-detection.md))
