# Feature: warn on duplicate considerations

**Status:** future. Not started; not part of the shipped Category 2 work (in-page names, add/remove rows) or the model-refinement pass.  
**Related:** [REVIEW.md](../REVIEW.md) Category 2, double-counting.

## Problem

Scoring is a **sum** of filled weights, transformed by the selected [scoring model](../README.md#scoring-models). How far several moderate cons go toward outweighing fewer, higher-rated ones depends on that model: under Linear they add up point for point, while Squared, Cubed and Doubling make each high rating progressively harder to cancel out.

Addable lists make a different failure easier. A user can list the same consideration more than once, phrased differently:

- "Higher salary"
- "More disposable income"
- "Better finances"

Those three rows are one benefit counted three times. The total is inflated even though each slider rating is honest. The same happens on cons ("long commute," "time in the car," "less time at home").

This is a list problem, not a reason to average, normalize, or cap how many rows an option may have.

## Goal

Detect near-duplicate pros or cons **within an option** and **warn** the user so they can merge, delete, or keep them if they really are distinct.

The app does not auto-correct the score. The user decides.

## Behavior (when built)

1. After the user has entered text on two or more filled rows in the same list (pros of A, cons of A, pros of B, or cons of B), analyze those texts for overlapping meaning.
2. If a pair (or group) looks like the same consideration, show a warning that names the rows and says they may be counting the same thing twice.
3. The user can dismiss, edit, or remove a row. Scoring stays the current sum until they change the list.
4. Do not warn across options. "Higher pay" on Stay and "higher pay" on Leave are a shared criterion, not a duplicate.
5. Do not warn on blank rows. Empty text is already ignored by scoring.

## Non-goals

- Changing `score = sum(pros) − sum(cons)`.
- Auto-merging or deleting rows.
- A shared criteria matrix (that is a separate product change).
- Blocking Calculate. A warning is enough.
- Shipping a model or API in the current static page unless this feature is actively implemented.

## Why AI (later)

Exact string match only catches copy-paste. The useful case is paraphrase. That needs semantic similarity (local or a hosted model), not a hardcoded synonym list.

When implementing, prefer:

- A **suggestion**, not a silent rewrite.
- Clear copy: which rows, why they look alike.
- Privacy: texts are the user’s decision notes; do not send them to a third party without an explicit, documented choice.
- Tests for the warning UX and for "leave these, they are different" as well as obvious paraphrases.

## Out of scope until then

Show-the-work (each row’s contribution) still helps people spot duplicates by eye. Build that without AI. This document is only for the automated warning.
