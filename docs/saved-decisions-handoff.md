# Saved decisions handoff

## Scope and decisions

The app remains a static GitHub Pages site. Saving and loading happen entirely in the browser through downloadable JSON files. There is no backend, database, account system, sign-in, or browser storage.

Use the product term **saved decisions**. The visible buttons are **Save** and **Load**.

Work in small, reviewable steps. Follow TDD for new behavior: write the observable behavior test, confirm it fails, then add the smallest production change. Refactors use the existing behavior tests and do not need tests for module boundaries or implementation details. Do not assert exact UI wording unless the test imports that wording from `js/constants/strings.js`.

The user explicitly asked the agent not to install or run Playwright. The user will run it. `npm test` is allowed and has been run throughout this work.

## Current status

The saved-decisions feature is implemented:

- **Save** downloads `saved-decisions.json` without requiring Calculate to succeed.
- The file preserves both decision names, all pro/con rows in order, blank and unfinished rows, ratings, and the selected scoring model.
- Consideration text is saved exactly as entered.
- **Load** opens a local JSON file picker and sends no data over the network.
- The complete file is parsed and validated before the table changes.
- A valid file restores names, all rows, sliders, numeric rating fields, the model, and model hints. It clears old calculation results and validation state.
- An invalid file leaves the current table unchanged and displays the accessible `LOAD_ERROR` message.
- The file input is cleared after each attempt, so the same file can be selected again.
- Loading over unsaved edits asks for confirmation. Cancel preserves the table; confirm replaces it.
- Initialization, Save, successful Load, and Reset establish a clean state. Editing names, rows, ratings, or the model marks the state dirty.

The JSON format is versioned:

```json
{
  "format": "decision-making-app-saved-decisions",
  "version": 1,
  "model": "squared",
  "decisions": [
    {
      "name": "Stay",
      "pros": [{ "text": "Good team", "rating": 8 }],
      "cons": [{ "text": "Long commute", "rating": 4 }]
    },
    {
      "name": "Leave",
      "pros": [{ "text": "New challenge", "rating": 7 }],
      "cons": [{ "text": "", "rating": 0 }]
    }
  ]
}
```

`format` identifies files created for this app. `version` allows a future format change to be recognized rather than misread.

## Current architecture

- `js/scripts.js` is the coordinator for initialization, Calculate, Reset, row events, and the model controls. It is now 157 lines, down from 520 during this work.
- `js/saved-decisions.js` owns JSON serialization and parsing/validation. It has no DOM behavior.
- `js/saved-decisions-ui.js` owns Save/Load controls, browser file handling, table capture/restoration, error feedback, dirty tracking, and replacement confirmation.
- `js/decision-validation.js` owns decision-name validation, calculation validation, and the validation dialog.
- `js/result-view.js` owns result and contributor-table DOM rendering.
- `js/consideration-rows.js` owns dynamic pro/con rows, slider/rating synchronization, and row validation.
- `js/scoring.js` owns scoring models and comparison logic.
- `js/constants/strings.js` owns user-facing strings.
- `js/constants/decision-table.js` is the shared source of table structure.

The shared table structure contains `DECISION_IDS`, `CONSIDERATION_LISTS`, `CONSIDERATION_KIND`, and generated `CONSIDERATION_GROUPS`. Groups are derived with nested loops, so adding a decision ID automatically produces its pro and con group definitions. Adding a third decision still requires HTML, scoring, and saved-file validation changes; the current product supports exactly two decisions.

Table capture and restoration both iterate over the shared decision IDs and consideration lists. The serializer accepts a nested `decisions` array rather than separate `decisionA`, `prosA`, `consA`, and corresponding B fields. The JSON format did not change during that refactor.

`initSavedDecisions` receives `updateModelHints` because restoring a model changes the select programmatically and must update both the model description and the concern hint. The callback does not recalculate anything.

## Validation currently implemented

`parseSavedDecisions` rejects:

- malformed JSON;
- the wrong format identifier;
- unsupported versions;
- unknown scoring models;
- anything other than exactly two decisions;
- missing or incorrectly typed decision fields;
- missing, empty, or incorrectly typed pro/con arrays;
- rows without string text;
- non-integer ratings or ratings outside 0–10.

Extra object properties are currently ignored. File-size, row-count, and text-length limits have not yet been added.

## Tests

The Vitest suite currently has **168 passing tests**:

```bash
npm test
```

`test/saved-decisions.test.js` covers serialized file contents, valid parsing, malformed JSON, wrong format/version, missing decisions, unknown models, and invalid ratings.

`e2e/decision.spec.js` contains unrun Playwright coverage for:

- downloading and inspecting `saved-decisions.json`;
- canceling and confirming replacement of unsaved edits;
- restoring every pro/con group, ratings, numeric inputs, model hints, and clearing old results;
- rejecting an invalid file without changing current values;
- retrying successfully after an invalid file.

Do not claim the browser behavior tests pass until the user runs them. The Playwright file has only been syntax-checked.

## Remaining work

Continue one small step at a time. Reasonable next steps are:

1. Extract the model dropdown and hint behavior from `scripts.js` into a focused module. This is the last planned modular split; do it only if the user wants to continue refactoring.
2. Have the user run the Playwright suite and address any failures they report. Do not install or run Playwright as the agent.
3. Add file-size, row-count, and text-length limits before treating arbitrary files as production-hardened input. Add behavior tests first.
4. Decide whether successful loads need their own accessible success announcement. Invalid loads already use an inline alert.
5. Update `README.md` with Save/Load instructions and explain that the JSON file is plain text and local to the user's device.

Do not add cloud storage, local storage, accounts, autosave, or a framework as part of this feature.

## Worktree caution

The worktree contains changes that predate or are unrelated to this feature, including `.gitignore` changes and deletion of `docs/model-refinement.md`. Preserve them. Do not reset or overwrite the user's work.
