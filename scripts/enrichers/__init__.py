# Enricher modules populate listing.enrich.<field> with {value, conf}.
# conf in {'verified', 'inferred', 'unknown'}.
#
# A field should be:
#   'verified' - read from authoritative source (state licensure DB,
#                Places API, Census ACS, the broker's own contact page)
#   'inferred' - derived via fuzzy match, heuristic, or stale cache > 24h
#   'unknown'  - we couldn't determine it this run; UI shows em-dash
