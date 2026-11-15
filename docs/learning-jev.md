# Learning Jev

## Lesson 1: One question, one answer

We send Jev **facts** (`state`) and a **question with possible answers** (`criteria`):

```json
"state": {
  "row_1": "Shorter commute",
  "row_2": "Can bike to work"
},
"questions": {
  "overlap_degree": {
    "type": "score",
    "instructions": "To what extent do row_1 and row_2 double-count the same benefit?",
    "criteria": [
      "Completely distinct considerations",
      "Related area, but separate concrete benefits",
      "Direct restatement of the exact same benefit"
    ]
  }
}
```

### Which parts are Jev's, and which are ours?

| Jev's (fixed by the API) | Ours (we make these up) |
|---|---|
| `state` | `row_1`, `row_2`: names we picked for the two pros |
| `questions` | `overlap_degree`: a name we picked for the question |
| `type`, and its value `"score"` | the `instructions` sentence |
| `instructions`, `criteria` | each answer sentence inside `criteria` |

* `state` can hold anything: a string, a list, or an object with keys we name. Jev just reads it as text.
* The `instructions` mention `row_1` and `row_2` so Jev knows which facts the question is about.
* The reply uses our name `overlap_degree` to tell us which question it's answering.

### What comes back

Jev doesn't write an answer. It gives each of our `criteria` sentences a percentage. This is the full answer to `overlap_degree` from our real run:

```json
"overlap_degree": {
  "type": "score",
  "probabilities": { "0": 0.01, "1": 0.86, "2": 0.13 },
  "score": 1.12,
  "confidence": 0.79,
  "legend": { "0": "Completely distinct considerations", "1": "Related area, but ...", "2": "Direct restatement ..." }
}
```

For now, just look at `probabilities`.

`0`, `1` and `2` are the positions of the three sentences in `criteria`. So Jev is 86% sure the answer is sentence `1`, "Related area, but separate concrete benefits". That's what we'd say too.

**Key idea:** The `criteria` sentences are the only answers Jev can give. We write them, and Jev picks among them. It never makes up its own.

### The question types

`type` can be one of four values:

| `type` | What you pass in `criteria` | What Jev returns (besides `probabilities`) | Example |
|---|---|---|---|
| `noul` | `{ "true": "...", "false": "..." }` | `"noul": 0.87` (probability of `true`) | "Are these two pros the same?" |
| `choice` | Named buckets (`{ "money": "...", "time": "..." }`) | `"choice": "time"` (the winning bucket name) | "Is this pro about money, time, or health?" |
| `score` | A low-to-high list (`["distinct", "related", "same"]`) | `"score": 1.12` (blended average from `0` to `N-1`) | How much do these two rows overlap, from `0` to `2`? |
| `box` | Description of what to find | Bounding box coordinates in an image | "Where is the logo in this photo?" |

---

## Lesson 2: What `score` means, and why wording matters

### How `1.12` is calculated

For `"Shorter commute"` vs `"Can bike to work"`, Jev returned:

```json
"probabilities": { "0": 0.01, "1": 0.86, "2": 0.13 },
"score": 1.12
```

`score` is just the **weighted average** of those probabilities, using each sentence's position (`0`, `1`, `2`) as its value:

```text
(0 × 0.01) + (1 × 0.86) + (2 × 0.13) = 0 + 0.86 + 0.26 = 1.12
```

Because `criteria` has 3 levels (`0`, `1`, `2`), `score` is always a single number from `0.00` to `2.00` summarizing where the probability mass sits.

### Comparing `score` (0–2 scale) vs `noul` (Yes/No) on 11 pairs

In our spike (`spike/try-jev.mjs`), we actually sent **two separate questions** for each pair to see which question type works better for catching duplicates:

1. **`overlap_degree` (`"type": "score"`):** our 3-step scale (`0` distinct, `1` related, `2` same) → returns `"score"` from `0.00` to `2.00`.
2. **`is_duplicate` (`"type": "noul"`):** a simple Yes/No (`true` = same, `false` = separate) → returns `"noul"` from `0.00` to `1.00` (the probability of `true`). `noul` is **only** returned for `"type": "noul"` questions; it is not part of `score` or `choice`.

Here is what both questions returned across all 11 pairs:

| Pair | My label | `is_duplicate` (`noul`, 0–1) | `overlap_degree` (`score`, 0–2) |
|---|---|---|---|
| Higher salary / More disposable income | same | 0.70 | 1.65 |
| Higher salary / Better finances | same | 0.80 | 1.78 |
| Shorter commute / Less time spent traveling to work | same | 0.95 | 2.00 |
| More vacation days / More paid time off | same | 0.89 | 1.91 |
| Long hours / Working late most nights | same | 0.87 | 1.97 |
| Higher salary / Better health insurance | related | 0.03 | 0.72 |
| Shorter commute / Can bike to work | related | 0.34 | 1.12 |
| Remote work option / Flexible hours | related | 0.15 | 0.94 |
| Learning new skills / Promotion opportunities | related | 0.09 | 0.89 |
| Higher salary / Shorter commute | unrelated | 0.03 | 0.23 |
| Friendly coworkers / Lower rent nearby | unrelated | 0.03 | 0.24 |

Notice two things Jev is doing well here:
1. **Clean gap:** Every `same` pair landed at `score ≥ 1.65` (`noul ≥ 0.70`), while every `related` pair landed at `score ≤ 1.12` (`noul ≤ 0.34`).
2. **Calibrated uncertainty:** `"Shorter commute"` vs `"Can bike to work"` is the closest call (`0.34` / `1.12`) — Jev put 86% on "related area, separate benefits" and 13% on "exact same", instead of pretending to be 99.9% sure.

### Why our wording matters

Jev has no scratchpad to think out loud — it matches `state + instructions` directly against each `criteria` sentence in one pass. That means **your prompt wording is part of the model's ruler**:

* **Domain mismatch:** Look at pair 5 (`"Long hours"` / `"Working late most nights"`). Those are **cons**, yet our spike prompt said `"Two pros listed..."` and `"same benefit"`. Jev still got `1.97` because the words were very close, but calling a con a "benefit" can push borderline cons toward `"0"` or `"1"`. Using neutral words (`"consideration"`, `"pros or cons"`) — or passing the actual list kind (`"pros"` vs `"cons"`) — avoids fighting the wording.
* **What "duplicate" means:** If `criteria` says *"Direct restatement of the exact same benefit"*, Jev will be stricter than if it says *"Counts the same reason twice"*. Changing those two sentences shifts the `score` distribution even on the exact same pairs.

---

## Lesson 3: Checking a whole list of considerations in one request

Why can't we just hand Jev a list of considerations and ask *"Which of these are duplicates?"*

Because **Jev can never write text or return a list of items** — it only returns a `0`–`2` score for each question you ask.

So to check a list of considerations, we have to ask Jev to compare them **two considerations at a time**. For example, if a user enters **3 considerations** in the same list:

* `0`: `"Higher salary"`
* `1`: `"More disposable income"`
* `2`: `"Shorter commute"`

To check every consideration against every other consideration in that list, there are **3 two-way comparisons**:
* Compare `0` and `1`: `"Higher salary"` vs `"More disposable income"`
* Compare `0` and `2`: `"Higher salary"` vs `"Shorter commute"`
* Compare `1` and `2`: `"More disposable income"` vs `"Shorter commute"`

Instead of making 3 separate HTTP calls, we put **all 3 comparison questions inside `questions` in a single request**:

```json
{
  "state": {
    "context": "Considerations listed for the same option in a pros/cons decision.",
    "considerations": [
      "Higher salary",
      "More disposable income",
      "Shorter commute"
    ]
  },
  "questions": {
    "pair_0_1": {
      "type": "score",
      "instructions": "To what extent do \"Higher salary\" and \"More disposable income\" double-count the same consideration?",
      "criteria": [
        "Completely distinct considerations",
        "Related area, but separate considerations",
        "Same underlying consideration worded differently (counting both double-counts it)"
      ]
    },
    "pair_0_2": {
      "type": "score",
      "instructions": "To what extent do \"Higher salary\" and \"Shorter commute\" double-count the same consideration?",
      "criteria": [
        "Completely distinct considerations",
        "Related area, but separate considerations",
        "Same underlying consideration worded differently (counting both double-counts it)"
      ]
    },
    "pair_1_2": {
      "type": "score",
      "instructions": "To what extent do \"More disposable income\" and \"Shorter commute\" double-count the same consideration?",
      "criteria": [
        "Completely distinct considerations",
        "Related area, but separate considerations",
        "Same underlying consideration worded differently (counting both double-counts it)"
      ]
    }
  }
}
```

And Jev answers **all 3 questions in one reply**:

```json
{
  "answers": {
    "pair_0_1": { "score": 1.58, "probabilities": { ... } },
    "pair_0_2": { "score": 0.23, "probabilities": { ... } },
    "pair_1_2": { "score": 0.33, "probabilities": { ... } }
  }
}
```

Our code then checks which `pair_i_j` answers came back with `score >= 1.5` (here, only `pair_0_1`, so considerations `0` and `1` are duplicates).

### Why put the actual consideration text in `instructions` instead of `row_0` and `row_1`?

When we first tried writing `"instructions": "To what extent do row_0 and row_2 double-count the same consideration?"` with 6 considerations in `state`, `"Higher salary"` vs `"Better finances"` dropped from **`1.78`** down to **`1.23`** (missing our `1.5` cutoff).

Why? Because Jev has **no scratchpad** — it scores in a single pass. Making it look up variable names (`row_0`, `row_2`) inside a 6-item `state` and compare them in the same single step muddies the score.

Putting the actual consideration texts directly in each question (`"Higher salary"` and `"Better finances"`) — and dropping `row_0` / `row_2` completely — fixed it immediately. Here are the results from our batched run (15 pro pairs in 1 request for `$0.000062`, and 10 con pairs in 1 request for `$0.000046`):

| List | Pairquestion | Considerations compared | `score` (0–2) | Flagged (`≥ 1.5`)? |
|---|---|---|---|---|
| Pros | `pair_0_1` | Higher salary / More disposable income | **1.58** | **YES** |
| Pros | `pair_0_2` | Higher salary / Better finances | **1.63** | **YES** |
| Pros | `pair_1_2` | More disposable income / Better finances | **1.78** | **YES** |
| Pros | `pair_0_3` | Higher salary / Better health insurance | 0.68 | no |
| Pros | `pair_4_5` | Shorter commute / Can bike to work | 1.38 | no |
| Cons | `pair_0_1` | Long commute / Time spent in the car | **1.93** | **YES** |
| Cons | `pair_0_2` | Long commute / Higher gas and car wear | 1.02 | no |
| Cons | `pair_3_4` | Long hours / Working late most nights | **1.80** | **YES** |
