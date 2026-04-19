"""reputation.py — Google rating + recent news headlines.

Populates:
  - googleRating:    { stars, count } via Google Places Find-Place + Place
                     Details. Requires GOOGLE_PLACES_API_KEY env var.
                     Without the key, the field stays 'unknown'.
  - recentHeadlines: array of {title, url, date} via Google News RSS
                     (no API key, lightweight). Skipped for anonymized
                     listings since "CO26-102 GP" returns nothing useful.

Why the confidence rules work this way:
  - Places API returns the canonical business record → 'verified'.
  - News RSS is a best-effort surface of recent mentions; we mark it
    'inferred' since any given headline may be about a different clinic.
"""

from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path
from typing import Optional
from urllib.parse import quote_plus

try:
    import requests
    from bs4 import BeautifulSoup
except Exception:
    requests = None  # type: ignore
    BeautifulSoup = None  # type: ignore

CACHE_DIR = Path(__file__).resolve().parent.parent / ".cache"
CACHE_DIR.mkdir(exist_ok=True)
PLACES_CACHE = CACHE_DIR / "google_places.json"
NEWS_CACHE = CACHE_DIR / "news.json"
STALE_AFTER = 7 * 24 * 3600

# Share the stricter broker-descriptor detector from practice.py so we don't
# burn Places quota on listings like "SW Denver GP $463K" or "12-op Practice".
try:
    from .practice import _looks_anonymized  # type: ignore
except Exception:  # pragma: no cover - fallback when run as a script
    BROKER_CODE_RE = re.compile(r"^[A-Z]{2,4}[\s\-]?\d{2,4}", re.I)

    def _looks_anonymized(name: str) -> bool:
        if not name:
            return True
        if BROKER_CODE_RE.match(name.strip()):
            return True
        alpha_words = [w for w in re.findall(r"[A-Za-z]{3,}", name)]
        return len(alpha_words) < 2


def _cache_load(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text("utf-8"))
    except Exception:
        return {}


def _cache_save(path: Path, data: dict) -> None:
    try:
        path.write_text(json.dumps(data, indent=2, sort_keys=True), "utf-8")
    except Exception:
        pass


# --------------------------------------------------------------------------
# Google Places
# --------------------------------------------------------------------------
def _google_rating(name: str, city: str, state: str) -> Optional[dict]:
    api_key = os.getenv("GOOGLE_PLACES_API_KEY", "")
    if not api_key or requests is None:
        return None
    cache = _cache_load(PLACES_CACHE)
    key = f"{name}|{city}|{state}"
    hit = cache.get(key) or {}
    if hit and time.time() - hit.get("fetched_at", 0) < STALE_AFTER:
        return hit.get("value")

    try:
        # Find Place from Text
        find_url = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
        r = requests.get(find_url, params={
            "input": f"{name} {city} {state}",
            "inputtype": "textquery",
            "fields": "place_id,rating,user_ratings_total,name",
            "key": api_key,
        }, timeout=8)
        r.raise_for_status()
        j = r.json()
        cand = (j.get("candidates") or [None])[0]
        if not cand:
            cache[key] = {"value": None, "fetched_at": time.time()}
            _cache_save(PLACES_CACHE, cache)
            return None
        value = {
            "stars": cand.get("rating"),
            "count": cand.get("user_ratings_total"),
            "placeId": cand.get("place_id"),
        }
        cache[key] = {"value": value, "fetched_at": time.time()}
        _cache_save(PLACES_CACHE, cache)
        return value
    except Exception:
        return None


# --------------------------------------------------------------------------
# Google News RSS
# --------------------------------------------------------------------------
def _google_news(name: str, city: str) -> Optional[list[dict]]:
    if requests is None or BeautifulSoup is None:
        return None
    q = quote_plus(f'"{name}" {city} dental')
    url = f"https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en"
    try:
        r = requests.get(
            url,
            timeout=8,
            headers={"User-Agent": "parikh-terminal-enricher/1.0 (asparikh08@gmail.com)"},
        )
        if r.status_code != 200:
            return None
        soup = BeautifulSoup(r.text, "xml")
        items = soup.find_all("item")[:5]
        out = []
        for it in items:
            title_el = it.find("title")
            link_el = it.find("link")
            date_el = it.find("pubDate")
            if not (title_el and link_el):
                continue
            out.append({
                "title": title_el.get_text(strip=True),
                "url": link_el.get_text(strip=True),
                "date": date_el.get_text(strip=True) if date_el else None,
            })
        return out if out else None
    except Exception:
        return None


# --------------------------------------------------------------------------
# Enrich entry point
# --------------------------------------------------------------------------
def enrich(listing: dict, ctx: dict) -> None:
    e = listing["enrich"]
    name = listing.get("name") or ""
    city = listing.get("city") or ""

    if _looks_anonymized(name):
        return  # skip: anonymized listings have nothing to match against

    if not ctx.get("online", True):
        return

    rating = _google_rating(name, city, listing.get("market", "").split(",")[-1].strip())
    if rating and rating.get("stars") is not None:
        # Attach a Maps deep-link so the UI can render the rating as a clickable
        # pill that jumps straight to the verified Google Business Profile.
        pid = rating.get("placeId")
        if pid:
            rating["mapsUrl"] = f"https://www.google.com/maps/place/?q=place_id:{pid}"
        e["googleRating"] = {"value": rating, "conf": "verified"}

    cache = _cache_load(NEWS_CACHE)
    key = f"{name}|{city}"
    hit = cache.get(key) or {}
    if hit and time.time() - hit.get("fetched_at", 0) < STALE_AFTER:
        headlines = hit.get("value")
    else:
        headlines = _google_news(name, city)
        cache[key] = {"value": headlines, "fetched_at": time.time()}
        _cache_save(NEWS_CACHE, cache)
    if headlines:
        e["recentHeadlines"] = {"value": headlines, "conf": "inferred"}
