# A+ Esthetic SEO Rank Tracker

The rank tracker is embedded in **A+ Esthetic → Website & SEO** (project `201`). It keeps separate history for Search Console (organic) and Google Maps / Orte. The first manual snapshot is seeded with the report date **2026-07-18**.

## Cloudflare Pages variables / secrets

Set these on the existing A+ Works Pages project:

- `GSC_CLIENT_EMAIL` — Google service-account email.
- `GSC_PRIVATE_KEY` — PKCS#8 private key from the service-account JSON. Multiline or `\\n` escaped values both work.
- `GSC_PROPERTY` — Search Console property, for example `sc-domain:a-esthetic.de` or `https://a-esthetic.de/`, matching the property to which the service account was granted access.
- `SERPAPI_KEY` — SerpApi key for Google Maps searches.
- `RANK_CRON_SECRET` — a long random secret used by the scheduled GitHub Action.
- Optional `MAPS_PLACE_ID` — recommended once known, to identify the exact Google Business Profile reliably.
- Optional `MAPS_MATCH_TEXT` — defaults to `a+ esthetic`.
- Optional `MAPS_LL` — defaults to central Frankfurt: `@50.1109,8.6821,13z`.

The existing `APP_PASSWORD` also authorizes the in-app **Aktualisieren** button.

## Google Search Console

Grant the service-account email access to the A+ Esthetic Search Console property. The collector requests read-only Search Console access and stores position, clicks, impressions and CTR by date.

## GitHub Actions daily schedule

The workflow `.github/workflows/seo-rankings.yml` runs daily at `05:20 UTC` and calls the deployed A+ Works endpoint.

Configure in GitHub repository settings:

- Repository variable `RANK_TRACKER_URL` — the deployed A+ Works origin, e.g. `https://...pages.dev` or the custom domain, without `/api`.
- Repository secret `RANK_CRON_SECRET` — exactly the same value as the Cloudflare Pages secret.

You can also run the workflow manually with **Run workflow**.

## API

- `GET /api/rankings/201?days=120` — keyword definitions and history.
- `GET /api/rankings/status` — non-sensitive configuration status.
- `POST /api/rankings/collect` — collect GSC + Maps now. Authorized by the app password or rank cron secret.

The API creates its D1 tables automatically with `CREATE TABLE IF NOT EXISTS`, so existing deployments do not require a manual migration. The SQL migration is included as documentation / optional manual setup.
