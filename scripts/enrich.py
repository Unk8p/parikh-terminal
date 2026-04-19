#!/usr/bin/env python3
"""
enrich.py — nightly enrichment orchestrator for Parikh Terminal.

Reads  data/listings.json
Runs   meta → geo → broker → practice → reputation enrichers in sequence.
Each enricher populates listing['enrich'][field] = {'value': ..., 'conf': ...}
  conf ∈ {'verified', 'inferred', 'unknown'}.
Writes data/listings.json (in place) and regenerates src/data.jsx.

Design goals:
  - Never crash on a single bad listing. Errors get logged, enrichment keeps going.
  - Enrichers are best-effort. If a data source is unreachable or requires a key
    we don't have, the field is left 'unknown' with a note on stdout.
  - firstSeen is set once and never overwritten.
  - lastChecked is updated every run so the UI can show staleness.
  - Deterministic JSON output (sorted keys, stable order) so git diffs stay clean.

Usage:
    python scripts/enrich.py                   # full run
    python scripts/enrich.py --dry-run         # no writes
    python scripts/enrich.py --only geo,meta   # run a subset
    python scripts/enrich.py --filter-scope    # only enrich listings that pass
                                               # the 'reality filters' (≈30 rows)
    python scripts/enrich.py --limit 5         # only enrich first N listings
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parent.parent
LISTINGS_JSON = REPO_ROOT / "data" / "listings.json"
BROKERS_JSON = REPO_ROOT / "data" / "brokers.json"
DATA_JSX = REPO_ROOT / "src" / "data.jsx"

sys.path.insert(0, str(REPO_ROOT / "scripts"))

from enrichers import meta, geo, broker, practice, reputation  # noqa: E402

ENRICHERS = {
    "meta": meta.enrich,
    "geo": geo.enrich,
    "broker": broker.enrich,
    "practice": practice.enrich,
    "reputation": reputation.enrich,
}

# Field → default conf seed. Mirrors src/enrichment.jsx hydrateListing().
ENRICH_SCHEMA = [
    "practiceUrl",
    "ownerName",
    "licenseNumber",
    "yearsLicensed",
    "sedationPermit",
    "googleRating",
    "proceduresOffered",
    "recentHeadlines",
    "medianIncome",
    "populationGrowth5y",
    "competingPractices3mi",
    "firstSeen",
    "lastChecked",
    "brokerName",
    "brokerPhone",
    "brokerEmail",
]


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def ensure_enrich(listing: dict) -> None:
    """Make sure listing['enrich'] has every field seeded to {None, 'unknown'}."""
    enrich = listing.setdefault("enrich", {})
    for field in ENRICH_SCHEMA:
        if field not in enrich or not isinstance(enrich[field], dict):
            enrich[field] = {"value": None, "conf": "unknown"}
        else:
            # Repair malformed entries
            if "value" not in enrich[field]:
                enrich[field]["value"] = None
            if enrich[field].get("conf") not in ("verified", "inferred", "unknown"):
                enrich[field]["conf"] = "unknown"


def passes_reality_filters(listing: dict) -> bool:
    """Default Reality-filter preset from the UI (sidebar.jsx).

    SBA cap: hide > $2.5M
    Specialty: hide pedo/ortho
    Too small: hide < 3 ops
    Too large: hide > 10 ops
    Chart sale: hide < $250K
    """
    coll = listing.get("collections") or 0
    if coll > 2_500_000:
        return False
    if coll and coll < 250_000:
        return False
    specialty = (listing.get("specialty") or "").lower()
    if any(k in specialty for k in ("pedo", "ortho")):
        return False
    ops = listing.get("ops")
    if isinstance(ops, (int, float)):
        if ops < 3 or ops > 10:
            return False
    return True


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def dump_json(path: Path, data) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def changed_fields(before: dict, after: dict) -> list[str]:
    """Return list of enrich.<field> names whose value changed."""
    b = (before or {}).get("enrich", {}) or {}
    a = (after or {}).get("enrich", {}) or {}
    keys = set(b) | set(a)
    diffs = []
    for k in sorted(keys):
        bv = b.get(k, {}).get("value")
        av = a.get(k, {}).get("value")
        if bv != av:
            diffs.append(k)
    return diffs


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------
def run(args) -> int:
    if not LISTINGS_JSON.exists():
        print(f"[enrich] {LISTINGS_JSON} not found — nothing to do", file=sys.stderr)
        return 1

    data = load_json(LISTINGS_JSON)
    brokers = load_json(BROKERS_JSON) if BROKERS_JSON.exists() else []
    listings = data.get("listings", [])
    print(f"[enrich] loaded {len(listings)} listings from {LISTINGS_JSON.name}")

    # Select which enrichers to run
    requested = [s.strip() for s in (args.only or "").split(",") if s.strip()]
    if requested:
        unknown = [r for r in requested if r not in ENRICHERS]
        if unknown:
            print(f"[enrich] unknown enrichers: {unknown}", file=sys.stderr)
            return 2
        to_run = [(n, ENRICHERS[n]) for n in requested]
    else:
        to_run = list(ENRICHERS.items())
    print(f"[enrich] enrichers: {[n for n,_ in to_run]}")

    # Shared context passed to each enricher
    context = {
        "brokers": brokers,
        "run_started": now_iso(),
        "repo_root": str(REPO_ROOT),
        "online": not args.offline,
    }

    # Pre-snapshot for diff reporting
    snapshot = json.loads(json.dumps(listings))  # deep copy

    touched = 0
    total_changes: dict[str, int] = {}
    for idx, listing in enumerate(listings):
        if args.limit and idx >= args.limit:
            break
        ensure_enrich(listing)

        if args.filter_scope and not passes_reality_filters(listing):
            continue

        before = json.loads(json.dumps(listing))
        try:
            for name, fn in to_run:
                try:
                    fn(listing, context)
                except Exception as e:  # single enricher failure shouldn't abort
                    print(
                        f"[enrich] {name} failed on #{listing.get('id')} "
                        f"({listing.get('name')}): {e}",
                        file=sys.stderr,
                    )
                    if args.verbose:
                        traceback.print_exc()
        except Exception as e:
            print(f"[enrich] listing #{listing.get('id')} aborted: {e}", file=sys.stderr)
            continue

        diffs = changed_fields(before, listing)
        if diffs:
            touched += 1
            for d in diffs:
                total_changes[d] = total_changes.get(d, 0) + 1

    # Summary
    print(f"[enrich] {touched}/{len(listings)} listings modified")
    if total_changes:
        print("[enrich] field change counts:")
        for k, v in sorted(total_changes.items(), key=lambda kv: -kv[1]):
            print(f"   {k:26s} {v}")

    if args.dry_run:
        print("[enrich] --dry-run: not writing files")
        return 0

    # Persist
    dump_json(LISTINGS_JSON, data)
    print(f"[enrich] wrote {LISTINGS_JSON}")

    # Regenerate src/data.jsx and src/overrides.jsx
    try:
        from regen_data_jsx import regenerate, regenerate_overrides
        regenerate(LISTINGS_JSON, BROKERS_JSON, DATA_JSX)
        print(f"[enrich] wrote {DATA_JSX}")
        overrides_json = REPO_ROOT / "data" / "overrides.json"
        overrides_jsx = REPO_ROOT / "src" / "overrides.jsx"
        regenerate_overrides(overrides_json, overrides_jsx)
        print(f"[enrich] wrote {overrides_jsx}")
    except Exception as e:
        print(f"[enrich] regen_data_jsx failed: {e}", file=sys.stderr)
        if args.verbose:
            traceback.print_exc()
        return 3

    return 0


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Parikh Terminal nightly enrichment")
    p.add_argument("--dry-run", action="store_true", help="don't write files")
    p.add_argument("--only", default="", help="comma list of enrichers (meta,geo,broker,practice,reputation)")
    p.add_argument("--filter-scope", action="store_true", help="only enrich listings passing reality filters")
    p.add_argument("--limit", type=int, default=0, help="only process first N listings")
    p.add_argument("--offline", action="store_true", help="skip network calls")
    p.add_argument("-v", "--verbose", action="store_true")
    return p.parse_args()


if __name__ == "__main__":
    sys.exit(run(parse_args()))
