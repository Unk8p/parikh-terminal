#!/usr/bin/env python3
"""regen_data_jsx.py — regenerate src/data.jsx from data/*.json.

The browser loads src/data.jsx as a plain <script>; it assigns
    window.PARIKH_DATA   = {...};
    window.PARIKH_BROKERS = [...];

This module takes the canonical JSON files and emits that JS wrapper.
Keep the output deterministic (sorted keys off to preserve field order,
but 2-space indent + trailing newline) so git diffs only reflect real
data changes.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path


def _iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat() + "Z"


def regenerate(listings_json: Path, brokers_json: Path, data_jsx: Path) -> None:
    listings = json.loads(Path(listings_json).read_text("utf-8"))
    brokers = json.loads(Path(brokers_json).read_text("utf-8")) if Path(brokers_json).exists() else []

    # Stamp the generation time onto the PARIKH_DATA envelope
    if isinstance(listings, dict):
        listings["generated"] = _iso_now()

    out = []
    out.append("// Auto-generated — embedded listings data")
    out.append("window.PARIKH_DATA = " + json.dumps(listings, indent=2, ensure_ascii=False) + ";")
    out.append("window.PARIKH_BROKERS = " + json.dumps(brokers, indent=2, ensure_ascii=False) + ";")
    out.append("")  # trailing newline

    Path(data_jsx).write_text("\n".join(out), encoding="utf-8")


def main(argv: list[str]) -> int:
    repo = Path(__file__).resolve().parent.parent
    regenerate(
        repo / "data" / "listings.json",
        repo / "data" / "brokers.json",
        repo / "src" / "data.jsx",
    )
    print(f"[regen] wrote {repo / 'src' / 'data.jsx'}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
