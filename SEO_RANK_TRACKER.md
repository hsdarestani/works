# A+ Esthetic SEO Rank Tracker

The tracker is embedded in **A+ Esthetic → Website & SEO** (project `201`). It keeps **Organic / Google Search** and **Google Orte / Maps** as separate series and preserves dated snapshots for the dashboard charts.

No third-party ranking API is required.

## Baseline snapshots

The user-supplied public/incognito checks are retained as the baseline:

- **2026-07-18** — first report.
- **2026-08-10** — second manual report.

Manual D1 entries take precedence over an automated observation for the same keyword, source and date.

## Automated browser check

GitHub Actions runs `.github/workflows/seo-rankings.yml` every day at **06:17 Europe/Berlin**. It installs Playwright + Chromium and runs `scripts/seo-rank-bot-v2.mjs` in a fresh non-persistent browser context configured with:

- locale `de-DE`;
- timezone `Europe/Berlin`;
- Frankfurt geolocation `50.1109, 8.6821`;
- no logged-in Google account or persisted search history.

The bot checks all configured keywords against `a-esthetic.de` and `A+ Esthetic`.

### Google Orte / Maps

The browser opens Google Maps around Frankfurt, scrolls the result feed, excludes visibly sponsored results and stores the organic local-result position when A+ Esthetic is found. Results are written to `rankings-auto.json` and committed by the GitHub Action.

### Google Organic

Google currently blocks Organic Search requests from the GitHub-hosted runner. The bot explicitly detects CAPTCHA / unusual-traffic pages and records the run as `blocked`; it **does not** convert a block into `NA` and does not overwrite the last valid Organic position.

The first two live GitHub Actions validations confirmed that Maps can be read from the runner while all Organic requests were blocked. The manual Organic-entry form remains available as a safe fallback.

## Failure safety

Only `ok` and genuine `not_found` observations become ranking data. `blocked` and `error` observations remain in the run diagnostics and are excluded from the ranking graph. This prevents CAPTCHA, network errors or parser failures from creating fake ranking drops.

## Dashboard merge

`rank-auto-bridge.js` loads `rankings-auto.json` from the repository and merges automated observations with D1/manual history. D1/manual values win when both sources have a value for the same date.

The dashboard shows:

- current Organic and Orte positions;
- changes versus the previous numeric observation;
- Top 10 / Top 20 totals;
- improved / dropped counts;
- per-keyword history charts;
- latest automated run health, including blocked/error counts;
- 30-day, 90-day, 120-day, one-year and all-time ranges.

## Manual fallback

Open **A+ Esthetic → Website & SEO → Keyword Rankings → Heutige Rankings** to enter or correct a dated snapshot manually. Enter `NA` only when the result was actually checked and A+ Esthetic was not found; leave a field empty when it was not checked.

## API

- `GET /api/rankings/201?days=120` — D1 keyword definitions and manual history.
- `GET /api/rankings/status` — tracker status.
- `POST /api/rankings/manual` — save a manual dated snapshot.

The ranking endpoint creates its D1 tables automatically with `CREATE TABLE IF NOT EXISTS`; the existing D1 database therefore does not require a manual migration.
