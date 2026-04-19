"""meta.py — timestamp bookkeeping.

- firstSeen: set once when a listing first enters the pipeline; never overwritten.
- lastChecked: updated every run so the UI can show staleness.

Both are stored as ISO-8601 UTC strings.
"""

from __future__ import annotations

from datetime import datetime, timezone


def _iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def enrich(listing: dict, ctx: dict) -> None:
    enrich = listing.setdefault("enrich", {})

    fs = enrich.get("firstSeen") or {}
    if not fs.get("value"):
        enrich["firstSeen"] = {"value": ctx.get("run_started") or _iso_now(), "conf": "verified"}

    # lastChecked: always set, confidence is 'verified' (we know exactly when we ran)
    enrich["lastChecked"] = {"value": ctx.get("run_started") or _iso_now(), "conf": "verified"}
