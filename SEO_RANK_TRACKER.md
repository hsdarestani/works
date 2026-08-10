# A+ Esthetic SEO Rank Tracker

The tracker is embedded in **A+ Esthetic → Website & SEO** (project `201`). It stores **Organic / Google Search** and **Google Orte / Maps** separately and keeps every dated snapshot for charts and trend calculations.

No external ranking API is required.

## Seeded snapshots

Two manual public-Google checks are currently seeded:

- **2026-07-18** — first manual report.
- **2026-08-10** — current manual report.

`NA` is stored as a checked result with no numeric position. A missing value means that source was not checked / not supplied for that keyword on that date.

## Daily/manual workflow

Open **A+ Esthetic → Website & SEO → Keyword Rankings** and click **Heutige Rankings**.

For every keyword:

- Enter the Organic rank in the Organic field.
- Enter the local Google Orte / Maps rank in the Orte field.
- Enter `NA` when you checked and A+ Esthetic was not found.
- Leave the field empty when that source was not checked.
- The Google and Maps links open the public searches for that keyword to make the manual check faster.

Change the date when entering an older report. Saving a date again updates that date instead of creating a duplicate.

## Dashboard

The tracker shows:

- current Organic and Orte positions per keyword;
- change versus the previous numeric observation;
- Top 10 / Top 20 totals;
- improved and dropped observations;
- per-keyword history chart;
- 30-day, 90-day, 120-day, one-year and all-time ranges.

## API

- `GET /api/rankings/201?days=120` — keyword definitions and history.
- `GET /api/rankings/status` — tracker mode/status.
- `POST /api/rankings/manual` — save a manual dated snapshot from the app.

The ranking endpoint creates its D1 tables automatically with `CREATE TABLE IF NOT EXISTS`, so the existing D1 database does not need a manual migration. `migrations/001_seo_rank_tracker.sql` is retained as schema documentation / optional manual setup.
