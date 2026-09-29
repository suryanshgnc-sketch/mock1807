# JEE Mock CBT

NTA-style computer-based test simulator for JEE Main / Advanced practice. Upload any paper PDF, attempt it in a real CBT interface, add the answer key, and get a detailed performance analysis. Runs 100% in the browser: no backend, no build step.

> Unofficial practice tool, not affiliated with NTA.

## Project structure

```
jee-mock-cbt/
├── index.html              Entry point (markup only)
├── css/
│   ├── style.css           Base CBT layout: palette, timer, exam screen
│   └── theme.css           Visual refresh + analysis/gamification styles
├── js/
│   ├── app.js              Storage, exam engine, evaluation, PDF viewer, cloud sync, home
│   └── analysis.js         Advanced analysis dashboard + XP/level/streak/badges
├── assets/
│   └── favicon.svg
├── .github/workflows/
│   └── pages.yml           Optional auto-deploy to GitHub Pages
├── .nojekyll               Tells Pages to serve files as-is
├── .gitignore
├── LICENSE                 MIT
└── README.md
```

## Deploy on GitHub Pages

1. Create a new GitHub repository and push these files to the `main` branch.
2. Go to **Settings → Pages**.
3. Under **Build and deployment** choose either:
   - **Deploy from a branch** → `main` / `(root)`, or
   - **GitHub Actions** (uses `.github/workflows/pages.yml`).
4. Your site goes live at `https://<username>.github.io/<repo>/`.

To run locally, just open `index.html`. No server needed.

## Features

- **Exam interface**: NTA-style palette (5 states), subject tabs, countdown timer, on-screen numeric keypad, mark for review, resume after refresh.
- **Test types**: Full mock, single subject, or custom questions, time and subject order.
- **PDF paper viewer**: the paper is stored in your browser (IndexedDB) and reused.
- **Evaluation**: auto-match with a pasted or PDF answer key (letters A–D are read as 1–4), or manual self-check.
- **Analysis**: score donut, accuracy, attempt rate, marks lost to negatives, auto-generated insights (rushed guesses, stuck questions, MCQ vs numerical accuracy, review-mark effectiveness), subject breakdown, time-per-question chart, filterable question review.
- **Progress**: score trend, subject accuracy, test history.
- **Gamification**: XP, levels, day streak, badges.
- **Backup**: JSON export/import and optional private GitHub Gist sync.

## Answer key formats

Paste text like `1 2 2 4 3 1 ...` (plain list) or `1 B 2 D 3 A ...` (question/answer pairs). PDF key import needs internet once, to load pdf.js.

## Data and privacy

Everything lives in `localStorage` and `IndexedDB` on your device. Nothing is uploaded, except when you use Gist sync with your own token (stored locally).

## Customising

- Marking scheme, duration, questions per subject: **Settings** in the app.
- Colours: CSS variables at the top of `css/theme.css`.
- XP and badge rules: bottom of `js/analysis.js`.

## License

MIT


## Manual answer-key checking
After submitting a test, switch to **Manual Checking**. Upload the official answer-key PDF once.
The verification workspace shows the question paper, question-by-question marking cards, and answer-key PDF together.
Use the question navigator to jump directly to a question, then mark **Correct** or **Wrong**.
Manual decisions are persisted with the test history.
