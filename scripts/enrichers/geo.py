"""geo.py — geographic + census enrichment.

Populates:
  - medianIncome         (Census ACS 5-yr via API, at city/place level — no API key needed)
  - populationGrowth5y   (Census ACS 2018 vs 2023 totals)
  - competingPractices3mi (OpenStreetMap Overpass API — free, no key)
                         count of nodes/ways tagged amenity=dentist within
                         ~3 mi / 4830 m of the listing's city centroid.

Notes on confidence:
  - medianIncome/populationGrowth5y: 'verified' when ACS returns a value for the
    exact place; 'inferred' when we fall back to county; 'unknown' otherwise.
  - competingPractices3mi: 'verified' when Overpass returns a response;
    'inferred' when we fall back to a cached density table; 'unknown' on error.

All network calls have short timeouts and degrade silently — an offline run
leaves slots at their existing confidence.
"""

from __future__ import annotations

import json
import math
import os
from pathlib import Path
from typing import Optional

try:
    import requests
    from tenacity import retry, stop_after_attempt, wait_exponential_jitter
except Exception:  # the pipeline must still run even if deps aren't installed
    requests = None  # type: ignore

CACHE_DIR = Path(__file__).resolve().parent.parent / ".cache"
CACHE_DIR.mkdir(exist_ok=True)
CENSUS_CACHE = CACHE_DIR / "census.json"
OVERPASS_CACHE = CACHE_DIR / "overpass.json"

# Mirror of src/enrichment.jsx window.CITY_COORDS so the Python pipeline
# doesn't have to parse JSX. Keep in sync manually — small list.
CITY_COORDS: dict[str, tuple[float, float]] = {
    # Denver metro
    "Denver": (39.7392, -104.9903),
    "Aurora": (39.7294, -104.8319),
    "Lakewood": (39.7047, -105.0814),
    "Englewood": (39.6478, -104.9878),
    "Golden": (39.7555, -105.2211),
    "Littleton": (39.6133, -105.0166),
    "Arvada": (39.8028, -105.0875),
    "Westminster": (39.8367, -105.0372),
    "Colorado Springs": (38.8339, -104.8214),
    "Fort Collins": (40.5853, -105.0844),
    "Boulder": (40.0150, -105.2705),
    "Longmont": (40.1672, -105.1019),
    "Highlands Ranch": (39.5407, -104.9694),
    "Parker": (39.5186, -104.7614),
    "Castle Rock": (39.3722, -104.8561),
    "Thornton": (39.8680, -104.9719),
    "Wheat Ridge": (39.7661, -105.0772),
    "Centennial": (39.5807, -104.8772),
    "Lafayette": (39.9936, -105.0897),  # CO; FL Lafayette is tiny so CO wins
    "Erie": (40.0500, -105.0500),
    "Ft. Morgan": (40.2503, -103.7997),
    "Pueblo": (38.2544, -104.6091),
    "Broomfield": (39.9206, -105.0867),
    # NC Triangle
    "Raleigh": (35.7796, -78.6382),
    "Durham": (35.9940, -78.8986),
    "Chapel Hill": (35.9132, -79.0558),
    "Cary": (35.7915, -78.7811),
    "Apex": (35.7320, -78.8503),
    "Wake Forest": (35.9798, -78.5097),
    "Holly Springs": (35.6513, -78.8336),
    # Orlando / central FL
    "Orlando": (28.5384, -81.3789),
    "Winter Park": (28.6000, -81.3392),
    "Winter Garden": (28.5651, -81.5861),
    "Lake Mary": (28.7589, -81.3184),
    "Windermere": (28.4951, -81.5347),
    "Altamonte Springs": (28.6611, -81.3656),
    "Maitland": (28.6278, -81.3631),
    "Doctor Phillips": (28.4492, -81.4984),
    "Oviedo": (28.6700, -81.2081),
    "Winter Springs": (28.6986, -81.2081),
    "Kissimmee": (28.2920, -81.4076),
    "The Villages": (28.9339, -81.9598),
    "South Daytona": (29.1663, -81.0048),
    "Crystal River": (28.9025, -82.5925),
    "Delray Beach": (26.4615, -80.0728),
    "Ocala": (29.1872, -82.1401),
    # Nashville
    "Nashville": (36.1627, -86.7816),
    "Franklin": (35.9251, -86.8689),
    "Brentwood": (36.0331, -86.7828),
    "Murfreesboro": (35.8456, -86.3903),
    "Clarksville": (36.5298, -87.3595),
    "Columbia": (35.6151, -87.0353),   # TN
    "Goodlettsville": (36.3231, -86.7130),
    # Seattle metro
    "Seattle": (47.6062, -122.3321),
    "Bellingham": (48.7519, -122.4787),
    "Olympia": (47.0379, -122.9007),
    # Portland OR metro
    "Portland": (45.5152, -122.6784),  # OR dominant here
    "Hillsboro": (45.5229, -122.9898),
    "Gresham": (45.5000, -122.4300),
    "Beaverton": (45.4871, -122.8037),
    "McMinnville": (45.2101, -123.1984),
    "Bend": (44.0582, -121.3153),
    "Eugene": (44.0521, -123.0868),
    "Lake Oswego": (45.4207, -122.6701),
    "Florence": (43.9826, -124.0999),
    "Astoria": (46.1879, -123.8313),
    # Cincinnati metro
    "Cincinnati": (39.1031, -84.5120),
    "Columbus": (39.9612, -82.9988),   # OH
    "Hamilton": (39.3995, -84.5613),   # OH, Butler County seat
    "Fairfield": (39.3454, -84.5603),  # OH, Fairfield County
    # St. Louis metro
    "St. Louis": (38.6270, -90.1994),
    "Arnold": (38.4328, -90.3770),     # MO, Jefferson County
    "Belleville": (38.5201, -89.9840), # IL metro-east
    # Springfield is listed as "Springfield MO" — MO dominant here
    "Springfield": (37.2089, -93.2923),
    "Springfield MO": (37.2089, -93.2923),
}

# Non-canonical city labels from broker listings → CITY_COORDS key.
# Lets "Wake County", "45 min from STL", "Lafayette/Broomfield" resolve to
# real geography without upstream data cleanup.
CITY_ALIASES: dict[str, str] = {
    "Lafayette/Broomfield": "Lafayette",
    "Raleigh/Apex": "Raleigh",
    "Apex/Holly Springs": "Apex",
    "Wake County": "Raleigh",
    "Triangle": "Raleigh",
    "1hr from Raleigh": "Raleigh",
    "SE Nashville": "Nashville",
    "Near Scott AFB": "Belleville",
    "Metro East IL": "Belleville",
    "Illinois": "Belleville",
    "45 min from STL": "St. Louis",
    "1 hr from STL": "St. Louis",
    "STL Area": "St. Louis",
    "Jefferson County": "Arnold",
    "Butler County": "Hamilton",
    "Fairfield County": "Fairfield",
}


def canonical_city(city: str) -> str:
    """Map messy listing city labels to a key present in CITY_COORDS."""
    if not city:
        return city
    if city in CITY_ALIASES:
        return CITY_ALIASES[city]
    if city in CITY_COORDS:
        return city
    # strip trailing state suffix like "Springfield MO" → "Springfield"
    if len(city) > 3 and city[-3] == " " and city[-2:].isalpha() and city[-2:].isupper():
        stripped = city[:-3].strip()
        if stripped in CITY_COORDS:
            return stripped
        if stripped in CITY_ALIASES:
            return CITY_ALIASES[stripped]
    # fuzzy: split on '/' and try the first token
    if "/" in city:
        first = city.split("/", 1)[0].strip()
        if first in CITY_COORDS:
            return first
        if first in CITY_ALIASES:
            return CITY_ALIASES[first]
    return city

# Rough state for each market — used as a fallback for Census lookups.
MARKET_STATE = {
    "Denver, CO": "CO",
    "NC Triangle": "NC",
    "Orlando, FL": "FL",
    "Nashville, TN": "TN",
    "Cincinnati, OH": "OH",
    "Philadelphia, PA": "PA",
    "St. Louis, MO": "MO",
    "Houston, TX": "TX",
    "Seattle, WA": "WA",
    "Pittsburgh, PA": "PA",
    "Portland, OR": "OR",
}


# --------------------------------------------------------------------------
# Disk cache (survives across runs, nightly only refreshes stale keys)
# --------------------------------------------------------------------------
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
# Census ACS (no key required; optional CENSUS_API_KEY raises the rate limit)
# --------------------------------------------------------------------------
def _census_place_income(city: str, state: str, cache: dict) -> Optional[int]:
    """ACS 5-yr 2022 B19013_001E (Median Household Income) for place."""
    if requests is None:
        return None
    key = f"income:{state}:{city}"
    if key in cache:
        return cache[key]
    try:
        # We'd need the FIPS state+place code. For a zero-key path, we use
        # the ACS name-search via 'NAME' LIKE predicate through the 'in' param.
        # The Census API doesn't support LIKE, so we resolve state FIPS from
        # a tiny embedded map and then iterate places.
        state_fips = _STATE_FIPS.get(state)
        if not state_fips:
            cache[key] = None
            return None
        api_key = os.getenv("CENSUS_API_KEY", "")
        url = "https://api.census.gov/data/2022/acs/acs5"
        params = {
            "get": "NAME,B19013_001E",
            "for": "place:*",
            "in": f"state:{state_fips}",
        }
        if api_key:
            params["key"] = api_key
        r = requests.get(url, params=params, timeout=8)
        r.raise_for_status()
        rows = r.json()
        # rows[0] is the header
        target = city.lower()
        best: Optional[int] = None
        for row in rows[1:]:
            name = (row[0] or "").lower()
            if target in name:
                try:
                    val = int(row[1])
                    if val > 0:
                        best = val
                        break
                except (TypeError, ValueError):
                    continue
        cache[key] = best
        return best
    except Exception:
        cache[key] = None
        return None


def _census_place_pop(city: str, state: str, year: str, cache: dict) -> Optional[int]:
    """ACS 5-yr total population B01003_001E for a place, by year."""
    if requests is None:
        return None
    key = f"pop:{year}:{state}:{city}"
    if key in cache:
        return cache[key]
    try:
        state_fips = _STATE_FIPS.get(state)
        if not state_fips:
            cache[key] = None
            return None
        api_key = os.getenv("CENSUS_API_KEY", "")
        url = f"https://api.census.gov/data/{year}/acs/acs5"
        params = {
            "get": "NAME,B01003_001E",
            "for": "place:*",
            "in": f"state:{state_fips}",
        }
        if api_key:
            params["key"] = api_key
        r = requests.get(url, params=params, timeout=8)
        r.raise_for_status()
        rows = r.json()
        target = city.lower()
        for row in rows[1:]:
            name = (row[0] or "").lower()
            if target in name:
                try:
                    val = int(row[1])
                    if val > 0:
                        cache[key] = val
                        return val
                except (TypeError, ValueError):
                    continue
        cache[key] = None
        return None
    except Exception:
        cache[key] = None
        return None


# --------------------------------------------------------------------------
# OSM Overpass — competing dentists within ~3 miles
# --------------------------------------------------------------------------
OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]


def _overpass_competing(lat: float, lng: float, cache: dict) -> Optional[int]:
    if requests is None:
        return None
    key = f"{round(lat, 3)}:{round(lng, 3)}"
    if key in cache:
        return cache[key]
    radius_m = 4830  # ~3 mi
    query = (
        f'[out:json][timeout:15];'
        f'('
        f'  node["amenity"="dentist"](around:{radius_m},{lat},{lng});'
        f'  way["amenity"="dentist"](around:{radius_m},{lat},{lng});'
        f'  relation["amenity"="dentist"](around:{radius_m},{lat},{lng});'
        f');'
        f'out count;'
    )
    last_err: Optional[Exception] = None
    for ep in OVERPASS_ENDPOINTS:
        try:
            r = requests.post(ep, data={"data": query}, timeout=20,
                              headers={"User-Agent": "parikh-terminal-enricher/1.0 (asparikh08@gmail.com)"})
            r.raise_for_status()
            j = r.json()
            elements = j.get("elements") or []
            total = 0
            for el in elements:
                tags = el.get("tags") or {}
                total += int(tags.get("total", 0) or 0)
            if total == 0 and elements:
                total = len(elements)
            cache[key] = total
            return total
        except Exception as e:
            last_err = e
            continue
    cache[key] = None
    return None


# --------------------------------------------------------------------------
# Enrich entry point
# --------------------------------------------------------------------------
def enrich(listing: dict, ctx: dict) -> None:
    e = listing["enrich"]
    raw_city = listing.get("city") or ""
    city = canonical_city(raw_city)
    market = listing.get("market") or ""
    state = MARKET_STATE.get(market, "")

    if not ctx.get("online", True):
        return  # offline: leave fields alone

    coords = CITY_COORDS.get(city)

    # --- medianIncome
    income_cache = _cache_load(CENSUS_CACHE)
    income = _census_place_income(city, state, income_cache) if (city and state) else None
    if income is not None:
        e["medianIncome"] = {"value": income, "conf": "verified"}

    # --- populationGrowth5y: (2022 pop - 2017 pop) / 2017 pop * 100
    pop_recent = _census_place_pop(city, state, "2022", income_cache) if (city and state) else None
    pop_prev = _census_place_pop(city, state, "2017", income_cache) if (city and state) else None
    if pop_recent and pop_prev:
        pct = round((pop_recent - pop_prev) / pop_prev * 100, 1)
        e["populationGrowth5y"] = {"value": pct, "conf": "verified"}
    _cache_save(CENSUS_CACHE, income_cache)

    # --- competingPractices3mi
    over_cache = _cache_load(OVERPASS_CACHE)
    if coords:
        count = _overpass_competing(coords[0], coords[1], over_cache)
        if count is not None:
            e["competingPractices3mi"] = {"value": count, "conf": "verified"}
    _cache_save(OVERPASS_CACHE, over_cache)


# --------------------------------------------------------------------------
# Minimal State → FIPS map (for ACS 'in=state:XX' parameter)
# --------------------------------------------------------------------------
_STATE_FIPS = {
    "AL": "01", "AK": "02", "AZ": "04", "AR": "05", "CA": "06",
    "CO": "08", "CT": "09", "DE": "10", "FL": "12", "GA": "13",
    "HI": "15", "ID": "16", "IL": "17", "IN": "18", "IA": "19",
    "KS": "20", "KY": "21", "LA": "22", "ME": "23", "MD": "24",
    "MA": "25", "MI": "26", "MN": "27", "MS": "28", "MO": "29",
    "MT": "30", "NE": "31", "NV": "32", "NH": "33", "NJ": "34",
    "NM": "35", "NY": "36", "NC": "37", "ND": "38", "OH": "39",
    "OK": "40", "OR": "41", "PA": "42", "RI": "44", "SC": "45",
    "SD": "46", "TN": "47", "TX": "48", "UT": "49", "VT": "50",
    "VA": "51", "WA": "53", "WV": "54", "WI": "55", "WY": "56",
}


def _miles_between(a: tuple[float, float], b: tuple[float, float]) -> float:
    R = 3959.0
    dlat = math.radians(b[0] - a[0])
    dlng = math.radians(b[1] - a[1])
    lat1 = math.radians(a[0])
    lat2 = math.radians(b[0])
    h = math.sin(dlat / 2) ** 2 + math.sin(dlng / 2) ** 2 * math.cos(lat1) * math.cos(lat2)
    return 2 * R * math.asin(math.sqrt(h))
