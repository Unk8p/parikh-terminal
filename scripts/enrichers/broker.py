"""broker.py — broker contact normalization.

For every listing, the goal is to end up with:
  brokerName / brokerPhone / brokerEmail

Strategy:
  1. Match listing['source'] (e.g. "Provide", "Henry Schein") against
     data/brokers.json to get the broker's canonical name + website.
  2. If a cached contact exists in .cache/broker_contacts.json, use it.
  3. Otherwise, fetch the broker's /contact (or root) page, parse it,
     and pull the first phone-like and email-like match from a contact
     block. Cache the result.

Confidence rules:
  - 'verified' when we pulled a phone/email directly from the broker's own
    domain (not a third party).
  - 'inferred' when we fell back to a cached value > 24 h old OR to a
    known default from a small table in this file.
  - 'unknown' when we couldn't match the listing to any broker.
"""

from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Optional

try:
    import requests
except Exception:
    requests = None  # type: ignore

CACHE_DIR = Path(__file__).resolve().parent.parent / ".cache"
CACHE_DIR.mkdir(exist_ok=True)
CONTACT_CACHE = CACHE_DIR / "broker_contacts.json"
STALE_AFTER = 24 * 3600  # seconds

# Phone: matches (555) 555-5555, 555-555-5555, 555.555.5555, +1 555 555 5555
PHONE_RE = re.compile(
    r"(?:\+?1[\s\-.]*)?\(?\d{3}\)?[\s\-.]*\d{3}[\s\-.]*\d{4}"
)
# Email: simple pragmatic pattern
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")

# Curated fallback contacts. These are public main numbers from broker websites
# (last confirmed Apr 2026). The pipeline prefers live-scrape results; this
# table only fires as an 'inferred' fallback.
FALLBACK_CONTACTS = {
    "Provide (Fifth Third Bank)": {
        "phone": "(888) 974-3338",
        "email": "hello@getprovide.com",
    },
    "Henry Schein Practice Transitions": {
        "phone": "(800) 988-5674",
        "email": "dpt@henryschein.com",
    },
    "ADS Transitions": {
        "phone": "(800) 988-5674",
        "email": None,
    },
    "Viper Equity Partners": {
        "phone": "(561) 220-2274",
        "email": "info@viperequitypartners.com",
    },
    "Professional Transition Strategies": {
        "phone": "(719) 694-8320",
        "email": "info@professionaltransition.com",
    },
}


# --------------------------------------------------------------------------
# Cache
# --------------------------------------------------------------------------
def _cache_load() -> dict:
    if not CONTACT_CACHE.exists():
        return {}
    try:
        return json.loads(CONTACT_CACHE.read_text("utf-8"))
    except Exception:
        return {}


def _cache_save(cache: dict) -> None:
    try:
        CONTACT_CACHE.write_text(json.dumps(cache, indent=2, sort_keys=True), "utf-8")
    except Exception:
        pass


# --------------------------------------------------------------------------
# Broker lookup
# --------------------------------------------------------------------------
def _find_broker(source: str, brokers: list[dict]) -> Optional[dict]:
    if not source:
        return None
    s = source.lower()
    for b in brokers:
        name = (b.get("name") or "").lower()
        if s in name or name.split(" ")[0] in s:
            return b
    # try substring matching on first token
    for b in brokers:
        name = (b.get("name") or "").lower()
        if s.split(" ")[0] in name:
            return b
    return None


def _fetch_contact_from_web(website: str) -> dict:
    """Try the broker's main site for a phone + email. Never throws."""
    if requests is None or not website:
        return {}
    url = website if website.startswith("http") else f"https://{website}"
    candidates = [url.rstrip("/") + p for p in ("/contact", "/contact-us", "")]
    for candidate in candidates:
        try:
            r = requests.get(
                candidate,
                timeout=6,
                headers={
                    "User-Agent": "parikh-terminal-enricher/1.0 (asparikh08@gmail.com)"
                },
                allow_redirects=True,
            )
            if r.status_code != 200:
                continue
            text = r.text
            # Only accept an email whose domain matches the broker's website
            # (avoids picking up random "support@somefakevendor.com" in a footer).
            host = website.replace("https://", "").replace("http://", "").split("/")[0]
            host_bare = host.replace("www.", "")
            email: Optional[str] = None
            for m in EMAIL_RE.finditer(text):
                if host_bare in m.group(0).lower():
                    email = m.group(0)
                    break
            phone_match = PHONE_RE.search(text)
            phone = phone_match.group(0) if phone_match else None
            if phone or email:
                return {"phone": phone, "email": email, "source_url": candidate}
        except Exception:
            continue
    return {}


# --------------------------------------------------------------------------
# Enrich entry point
# --------------------------------------------------------------------------
def enrich(listing: dict, ctx: dict) -> None:
    e = listing["enrich"]
    brokers = ctx.get("brokers") or []
    source = listing.get("source") or ""

    broker = _find_broker(source, brokers)
    if not broker:
        # Nothing more we can do
        return

    name = broker.get("name") or source
    website = broker.get("website") or ""
    e["brokerName"] = {"value": name, "conf": "verified"}

    # Cache-first
    cache = _cache_load()
    now = time.time()
    cache_key = website or name
    hit = cache.get(cache_key) or {}
    age = now - hit.get("fetched_at", 0)
    fresh = bool(hit) and age < STALE_AFTER

    # Phone and email are filled independently so that a scrape which yields
    # only an email (common on modern broker sites where the phone is in a
    # tel: link or rendered via JS) still gets a phone from the inline broker
    # record or FALLBACK_CONTACTS.
    scraped: dict = {}
    if fresh:
        scraped = {"phone": hit.get("phone"), "email": hit.get("email")}
    elif ctx.get("online", True):
        scraped = _fetch_contact_from_web(website)
        if scraped:
            cache[cache_key] = {**scraped, "fetched_at": now}
            _cache_save(cache)

    fb = FALLBACK_CONTACTS.get(name) or {}
    inline_phone = broker.get("phone")
    inline_email = broker.get("email")

    # Phone: scrape (verified) → inline broker record → fallback table
    if scraped.get("phone"):
        e["brokerPhone"] = {"value": scraped["phone"], "conf": "verified"}
    elif inline_phone:
        e["brokerPhone"] = {"value": inline_phone, "conf": "inferred"}
    elif fb.get("phone"):
        e["brokerPhone"] = {"value": fb["phone"], "conf": "inferred"}

    # Email: scrape (verified) → inline broker record → fallback table
    if scraped.get("email"):
        e["brokerEmail"] = {"value": scraped["email"], "conf": "verified"}
    elif inline_email:
        e["brokerEmail"] = {"value": inline_email, "conf": "inferred"}
    elif fb.get("email"):
        e["brokerEmail"] = {"value": fb["email"], "conf": "inferred"}
