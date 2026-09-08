# DECISION MAKING APP

Compare two options by listing pros and cons and rating each one from 0–10. Each rating is both how important that consideration is and how much it would affect you. Empty rows are ignored.

The app scores each option as **pros minus cons**, then reports which name leads and by how many points (not a percentage). A tie, or missing names, is stated in plain language.

## Use the App

- Run `npm run serve` (Vite, usually http://localhost:5173/) and open that URL, or visit [the hosted page](https://brentgrammer.github.io/Decision-Making-App/).
- Click **START!** to name the two decisions, fill rows, then **Calculate!**. **RESET** clears names, inputs, slider labels, and the result.

```bash
npm install   # first clone only
npm test
npm run serve
```

### Future improvements

- Style the UI and keep sliders inside their cells
- In-page name fields instead of `prompt()`
- Add and remove rows; show how much each row contributed
