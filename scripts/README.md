# scripts/

Nightly enrichment pipeline for Parikh Terminal. Reads
`data/listings.json`, fills in each listing's `enrich.<field>` slots,
writes back to JSON, and regenerates `src/data.jsx`.

## Run it locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r scripts/requirements.txt

# full run
python scripts/enrich.py

# safer options while iterating
python scripts/enrich.py --dry-run --verbose      # no writes, print summary
python scripts/enrich.py --offline --limit 5      # skip network, first 5 rows
python scripts/enrich.py --only meta,geo          # subset of enrichers
python scripts/enrich.py --filter-scope           # only the ~30 in-scope rows
```

## How the pipeline is organized

```
scripts/
├── enrich.py              # orchestrator
├── regen_data_jsx.py      # rewrites src/data.jsx from data/*.json
├── requirements.txt
├── .cache/                # per-enricher response cache (gitignored)
└── enrichers/
    ├── meta.py            # firstSeen / lastChecked timestamps
    ├── geo.py             # Census ACS + OpenStreetMap Overpass
    ├── broker.py          # broker contact normalization
    ├── practice.py        # NDA-gated fields (practiceUrl, owner, license, sedation permit)
    └── reputation.py      # Google Places rating + Google News headlines
```

Each enricher exposes a single `enrich(listing, ctx)` function that
mutates `listing['enrich']` in place. Errors inside one enricher are
logged but never abort the run.

## Confidence rules

Every `enrich.<field>` is a dict `{ "value": ..., "conf": ... }`:

| conf       | meaning                                                     |
|------------|-------------------------------------------------------------|
| `verified` | read directly from an authoritative source this run         |
| `inferred` | derived from a heuristic, fuzzy match, or stale cache >24h  |
| `unknown`  | we couldn't determine it; UI shows em-dash                  |

The UI honors these — `verified` values render with no badge, `inferred`
gets a subtle dot, `unknown` is a dash. Never upgrade `inferred` →
`verified` unless you pulled a fresh authoritative read.

## What each enricher actually does

### `meta.py`
Sets `firstSeen` (once, never overwritten) and `lastChecked` (every
run). Both ISO-8601 UTC.

### `geo.py`
Uses the Census ACS API (free, optional `CENSUS_API_KEY` for higher
rate limits) to pull:
- `medianIncome` — ACS 5-yr `B19013_001E` at the listing's city
- `populationGrowth5y` — (2022 − 2017) / 2017 × 100

Then hits the OpenStreetMap Overpass API (free, no key) to count
`amenity=dentist` nodes within ~3 mi of the city centroid and stores
the count as `competingPractices3mi`.

Both sources are cached to `scripts/.cache/` so the nightly run only
re-fetches what has expired.

### `broker.py`
Matches `listing.source` against `data/brokers.json`, fetches the
broker's `/contact` page, and pulls the first phone- and email-pattern
matches (only accepting emails whose domain matches the broker's own
site). Falls back to a small curated table for major brokers. Results
cached 24 h.

### `practice.py` — NDA-gated
Most listings are anonymized broker codes (`CO26-102 GP`). For those,
`practiceUrl`/`ownerName`/`licenseNumber`/`yearsLicensed`/
`sedationPermit` will stay `unknown` until you sign an NDA and upload
the CIM.

For named clinics the pipeline searches DuckDuckGo for the practice's
own website, scrapes it for the procedure keyword set (`Implants`,
`IV sedation`, `Invisalign`, …), and stores both fields as `inferred`.

The pipeline also attaches a `lookupUrl` for state license and
sedation-permit registries — the UI renders this as a "look it up"
link next to fields that stay `unknown`.

### `reputation.py`
Optional Google Places API (requires `GOOGLE_PLACES_API_KEY`) for
`googleRating = { stars, count }`. Without the key, the field stays
`unknown`.

Google News RSS (no key) provides `recentHeadlines` for named
clinics — up to 5 most-recent items `{ title, url, date }`. Always
`inferred` since News can mismatch similar clinic names.

## Environment variables

| var                       | unlocks                                     |
|---------------------------|---------------------------------------------|
| `CENSUS_API_KEY`          | higher ACS rate limit (optional)            |
| `GOOGLE_PLACES_API_KEY`   | `googleRating` (otherwise `unknown`)        |

In GitHub Actions both are read from repo secrets; local runs can set
them in `.env` or your shell.

## Nightly job

`.github/workflows/nightly.yml` runs this pipeline at 08:00 UTC each
day and opens a PR against `main` when any data file changed. Merging
the PR triggers a DigitalOcean App Platform redeploy.

We open a PR (not a direct push) so Ankit can sanity-check the diff
before it ships — especially helpful for catching a broker site
changing its contact page layout and flipping everything to
`inferred`.
