"""practice.py — practice-facts enrichment (NDA-gated fields).

Most broker listings are anonymized: "CO26-102 GP", "COD154 NE North Field GP".
For those, we can't find the owner, license, or sedation permit — those only
unlock after you sign an NDA and receive the CIM. The pipeline keeps those
fields 'unknown' rather than guessing.

For listings whose `name` looks like a real clinic (title-cased words, not
a broker code), we attempt a best-effort lookup:

  - practiceUrl:   DuckDuckGo HTML search for "{name} {city}" and pick the
                   first result whose domain isn't a known broker/directory.
  - ownerName / licenseNumber / yearsLicensed: state dental board search
                   (URL-templated per state). Scraping these is slow and
                   brittle, so by default we surface the *search URL* and
                   leave the value as None, conf='inferred' — so the UI
                   can render a "look this up" link until someone confirms.
  - sedationPermit: same approach — surface the state-specific permit
                   registry search URL.
  - proceduresOffered: parse the practice website for common dentistry
                   service words (implants, sedation, endo, cosmetic, etc.)
                   and return the matching set.

All network calls have short timeouts and degrade silently.
"""

from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Optional
from urllib.parse import quote_plus, urlparse

try:
    import requests
    from bs4 import BeautifulSoup
except Exception:
    requests = None  # type: ignore
    BeautifulSoup = None  # type: ignore

CACHE_DIR = Path(__file__).resolve().parent.parent / ".cache"
CACHE_DIR.mkdir(exist_ok=True)
SEARCH_CACHE = CACHE_DIR / "practice_urls.json"
STALE_AFTER = 7 * 24 * 3600  # practice URLs rarely change; cache 7 days

BROKER_CODE_RE = re.compile(r"^[A-Z]{2,4}[\s\-]?\d{2,4}", re.I)
BROKER_DOMAINS = {
    "getprovide.com", "provide.com", "henryschein.com",
    "dentalpracticetransitions.henryschein.com", "adstransitions.com",
    "viperequitypartners.com", "professionaltransition.com",
    "dentaltown.com", "dentalpost.net", "linkedin.com",
    "yelp.com", "healthgrades.com", "zocdoc.com",
}

# State dental-board search endpoints (public license lookup sites).
# These are the URL patterns we link to — the pipeline doesn't try to
# parse the results automatically because most are JavaScript-rendered.
STATE_LICENSE_LOOKUP = {
    "CO": "https://apps.colorado.gov/dora/licensing/Lookup/LicenseLookup.aspx",
    "FL": "https://appsmqa.doh.state.fl.us/MQASearchServices/HealthCareProviders",
    "TN": "https://apps.tn.gov/hlrs/",
    "NC": "https://portal.ncdentalboard.org/verification/Search.aspx",
    "OH": "https://elicense.ohio.gov/oh_verifylicense",
    "PA": "https://www.pals.pa.gov/#/page/search",
    "MO": "https://renew.pr.mo.gov/licensee-search.asp",
    "TX": "https://www.tsbde.texas.gov/licensee-search/",
    "WA": "https://fortress.wa.gov/doh/providercredentialsearch/",
    "OR": "http://www.oregon.gov/dentistry/Pages/Licensee-Search.aspx",
}

# State sedation-permit registries (separate from general license lookup).
STATE_SEDATION_LOOKUP = {
    "CO": "https://www.colorado.gov/dora/licensing/Lookup/LicenseLookup.aspx",
    "FL": "https://www.floridasdentistry.gov/licensure/sedation-permits/",
    "TN": "https://www.tn.gov/health/health-program-areas/health-professional-boards/dentistry-board/sedation-permits.html",
    "NC": "https://www.ncdentalboard.org/sedation.aspx",
}

MARKET_STATE = {
    "Denver, CO": "CO", "NC Triangle": "NC", "Orlando, FL": "FL",
    "Nashville, TN": "TN", "Cincinnati, OH": "OH", "Philadelphia, PA": "PA",
    "St. Louis, MO": "MO", "Houston, TX": "TX", "Seattle, WA": "WA",
    "Pittsburgh, PA": "PA", "Portland, OR": "OR",
}

# Procedure keywords → display label. We scan the practice website text.
PROCEDURE_KEYWORDS = [
    ("implant", "Implants"),
    ("iv sedation", "IV sedation"),
    ("oral sedation", "Oral sedation"),
    ("nitrous", "Nitrous"),
    ("all-on-4", "All-on-4"),
    ("invisalign", "Invisalign"),
    ("clear aligner", "Clear aligners"),
    ("cosmetic", "Cosmetic"),
    ("veneer", "Veneers"),
    ("root canal", "Endo"),
    ("endodont", "Endo"),
    ("periodont", "Perio"),
    ("extraction", "Extractions"),
    ("wisdom tooth", "Wisdom teeth"),
    ("crown", "Crowns"),
    ("denture", "Dentures"),
    ("whitening", "Whitening"),
]


def _looks_anonymized(name: str) -> bool:
    """Broker-written listing titles ('SW Denver GP $463K', 'Kissimmee
    Practice', '12-op Practice') aren't real clinic names and make DDG
    searches return broker directories + random yelp pages. Filter them
    out before burning a web request."""
    if not name:
        return True
    n = name.strip()
    if BROKER_CODE_RE.match(n):
        return True

    # Any of these patterns means the title was written by a broker
    # describing the practice, not the practice's own brand name.
    BROKER_JARGON = [
        r"\$\s*[\d\.,]+\s*[KMkm]\b",                  # $463K, $1.857M
        r"\b\d+\s*op(s|ops)?\b",                       # 5 ops
        r"\b\d+-op\b",                                 # 12-op
        r"\bGP\b", r"\bFFS\b", r"\bPedo\b", r"\bOrtho\b",
        r"\bPractice\s*$",                             # ends with "Practice"
        r"\bPractice\s+Opportunity\b",
        r"\bBuyer\s+Opportunity\b",
        r"\bTurnkey\b", r"\bStartup\b", r"\bMerger\b",
        r"\bReduction\b|\bREDUCED\b",
        r"\bMulti[-\s]?Location\b",
        r"\b\d+\s*(-\s*)?(min|minutes?|hour|hours?|hr|hrs)\s+(from|out)\b",
        r"\b\d+hr\s+from\b",
        r"\b\d+(st|nd|rd|th)?\s+Gen\b",                # 3rd Gen
        r"\b(North|South|East|West|NE|NW|SE|SW|Downtown|Suburban|Suburb|Rural|Greater|Metro)\b",
        r"\bCounty\b", r"\bArea\b",
        r"\bsqft\b",
    ]
    for pat in BROKER_JARGON:
        if re.search(pat, n, re.I):
            return True

    alpha_words = [w for w in re.findall(r"[A-Za-z]{3,}", n)]
    return len(alpha_words) < 2


def _cache_load() -> dict:
    if not SEARCH_CACHE.exists():
        return {}
    try:
        return json.loads(SEARCH_CACHE.read_text("utf-8"))
    except Exception:
        return {}


def _cache_save(cache: dict) -> None:
    try:
        SEARCH_CACHE.write_text(json.dumps(cache, indent=2, sort_keys=True), "utf-8")
    except Exception:
        pass


def _is_broker_domain(url: str) -> bool:
    try:
        host = urlparse(url).netloc.lower().replace("www.", "")
        return any(bd in host for bd in BROKER_DOMAINS)
    except Exception:
        return True


def _find_practice_url(name: str, city: str, state: str) -> Optional[str]:
    """Use DuckDuckGo HTML endpoint (no key) to find the practice's own site."""
    if requests is None or BeautifulSoup is None:
        return None
    q = f"{name} dental {city} {state}"
    url = f"https://duckduckgo.com/html/?q={quote_plus(q)}"
    try:
        r = requests.get(
            url,
            timeout=8,
            headers={"User-Agent": "parikh-terminal-enricher/1.0 (asparikh08@gmail.com)"},
        )
        if r.status_code != 200:
            return None
        soup = BeautifulSoup(r.text, "lxml")
        for a in soup.select("a.result__a"):
            href = a.get("href") or ""
            if not href:
                continue
            # DDG sometimes wraps results through /l/?uddg=<encoded url>
            if "uddg=" in href:
                from urllib.parse import parse_qs, unquote
                qs = parse_qs(urlparse(href).query)
                href = unquote((qs.get("uddg") or [href])[0])
            if href.startswith("http") and not _is_broker_domain(href):
                return href
    except Exception:
        return None
    return None


def _scrape_procedures(practice_url: str) -> Optional[list[str]]:
    if requests is None or BeautifulSoup is None or not practice_url:
        return None
    try:
        r = requests.get(
            practice_url,
            timeout=8,
            headers={"User-Agent": "parikh-terminal-enricher/1.0 (asparikh08@gmail.com)"},
        )
        if r.status_code != 200:
            return None
        text = BeautifulSoup(r.text, "lxml").get_text(" ").lower()
        found: set[str] = set()
        for kw, label in PROCEDURE_KEYWORDS:
            if kw in text:
                found.add(label)
        return sorted(found) if found else None
    except Exception:
        return None


# --------------------------------------------------------------------------
# Enrich entry point
# --------------------------------------------------------------------------
def enrich(listing: dict, ctx: dict) -> None:
    e = listing["enrich"]
    name = listing.get("name") or ""
    city = listing.get("city") or ""
    market = listing.get("market") or ""
    state = MARKET_STATE.get(market, "")

    anonymized = _looks_anonymized(name)

    # --- Surface the state license / sedation lookup URL as an 'inferred'
    #     value even when anonymized. Gives the UI a "look this up" button.
    if state in STATE_LICENSE_LOOKUP:
        if not e.get("licenseNumber", {}).get("value"):
            e["licenseNumber"] = {
                "value": None,
                "conf": "unknown",
                "lookupUrl": STATE_LICENSE_LOOKUP[state],
            }
    if state in STATE_SEDATION_LOOKUP:
        if not e.get("sedationPermit", {}).get("value"):
            e["sedationPermit"] = {
                "value": None,
                "conf": "unknown",
                "lookupUrl": STATE_SEDATION_LOOKUP[state],
            }

    if anonymized:
        return  # can't do web lookup without a real practice name

    if not ctx.get("online", True):
        return

    # --- practiceUrl via DDG search (cached)
    cache = _cache_load()
    now = time.time()
    key = f"{name}|{city}|{state}"
    hit = cache.get(key) or {}
    url = hit.get("url") if (now - hit.get("fetched_at", 0) < STALE_AFTER) else None
    if not url:
        url = _find_practice_url(name, city, state)
        cache[key] = {"url": url, "fetched_at": now}
        _cache_save(cache)
    if url:
        e["practiceUrl"] = {"value": url, "conf": "inferred"}

    # --- proceduresOffered: scrape practice page
    if url:
        procs = _scrape_procedures(url)
        if procs:
            e["proceduresOffered"] = {"value": procs, "conf": "inferred"}
