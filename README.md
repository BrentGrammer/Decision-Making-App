# DECISION MAKING APP

Compare two options by listing pros and cons and rating each one from 0–10. Each rating is both how important that consideration is and how much it would affect you. Empty rows are ignored.

The app scores each option as **pros minus cons**, then reports which name leads and by how many points (not a percentage). A tie, or missing names, is stated in plain language.

## Use the App

- Run `npm run serve` (Vite, usually http://localhost:5173/) and open that URL, or visit [the hosted page](https://brentgrammer.github.io/Decision-Making-App/).
- Type each option’s name in the Decision column (1–50 characters), fill rows, then **Calculate**. **RESET** clears names, inputs, slider labels, and the result.

```bash
npm install   # first clone only
npx playwright install chromium   # first clone only, for browser tests
npm test
npm run test:e2e
npm run serve
```

### Future improvements

- Show how much each row contributed and sensitivity (“would one point flip the winner?”)
- Warn when the same pro or con is listed more than once in different words ([AI duplicate detection](docs/ai-duplicate-detection.md))
